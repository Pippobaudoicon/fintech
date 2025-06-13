import prisma from '../config/database';
import { generateTransactionReference } from '../utils/helpers';
import { TransactionRequest, TransferRequest, PaymentRequest, TransactionFilters, TransactionAnalytics } from '../types';
import { TransactionType, TransactionStatus } from '@prisma/client';
import { AccountService } from './accountService';
import redisClient from '../config/redis';

export class TransactionService {
  private accountService = new AccountService();

  /**
   * Fetches and caches the full USD rates table from the API if needed, using Redis.
   */
  private async getUsdRates(): Promise<Record<string, number>> {
    const CACHE_KEY = 'exchange:usd:rates';
    const CACHE_TTL_SECONDS = 2 * 60 * 60; // 2 hours
    // Try to get from Redis
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // Ignore parse error, will fetch fresh
      }
    }
    // Fetch from API
    const apiKey = process.env.EXCHANGE_API_KEY;
    if (!apiKey) throw new Error('Exchange rate API key is missing. Set EXCHANGE_API_KEY in your environment.');
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }
    const data = (await response.json()) as { conversion_rates?: Record<string, number> };
    if (!data.conversion_rates) {
      throw new Error('Exchange rate API returned invalid data');
    }
    // Save to Redis
    await redisClient.set(CACHE_KEY, JSON.stringify(data.conversion_rates), { EX: CACHE_TTL_SECONDS });
    return data.conversion_rates;
  }

  /**
   * Gets the conversion rate from one currency to another using the cached USD rates table.
   * All conversions go through USD.
   */
  private async getCachedConversionRate(from: string, to: string): Promise<number> {
    if (from === to) return 1;
    const rates = await this.getUsdRates();
    if (from === 'USD') {
      if (!rates[to]) throw new Error(`No rate found for USD to ${to}`);
      return rates[to];
    }
    if (to === 'USD') {
      if (!rates[from]) throw new Error(`No rate found for ${from} to USD`);
      return 1 / rates[from];
    }
    if (!rates[from] || !rates[to]) {
      throw new Error(`No rate found for ${from} or ${to}`);
    }
    // Convert from 'from' to USD, then USD to 'to'
    return (1 / rates[from]) * rates[to];
  }

  /**
   * Handles currency conversion for deposits. Returns the correct amount, currency, and metadata.
   * Uses the cached USD rates table for conversion.
   */
  private async prepareDepositAmountAndMeta(tx: any, transactionData: TransactionRequest, toAccount: any)
    : Promise<{ amount: number; currency: string; metadata?: any }> {
    const depositCurrency = transactionData.currency || 'USD';
    const accountCurrency = toAccount.currency;
    if (depositCurrency === accountCurrency) {
      return { amount: transactionData.amount, currency: accountCurrency };
    }
    const rate = await this.getCachedConversionRate(depositCurrency, accountCurrency);
    const convertedAmount = parseFloat((transactionData.amount * rate).toFixed(2));
    const metadata = {
      originalAmount: transactionData.amount,
      originalCurrency: depositCurrency,
      convertedAmount,
      accountCurrency,
      conversionRate: rate,
      conversionTimestamp: new Date().toISOString(),
    };
    return { amount: convertedAmount, currency: accountCurrency, metadata };
  }

  async createTransaction(userId: string, transactionData: TransactionRequest) {
    //TODO KYC check when ultimated (remember to uncomment this and update test cases)
    // const user = await prisma.user.findUnique({ where: { id: userId } });
    // if (!user || user.kycStatus !== 'APPROVED') {
    //   throw new Error('KYC not approved. Please complete KYC verification to perform transactions.');
    // }

    const reference = generateTransactionReference();

    return prisma.$transaction(async (tx) => {
      let useAmount = transactionData.amount;
      let useCurrency = transactionData.currency || 'USD';
      let conversionMeta: any = undefined;

      // Handle deposit with possible currency conversion
      if (transactionData.type === TransactionType.DEPOSIT && transactionData.toAccountId) {
        const toAccount = await tx.account.findUnique({ where: { id: transactionData.toAccountId } });
        if (!toAccount) {
          throw new Error('Destination account not found');
        }
        // Use the improved conversion handler
        const result = await this.prepareDepositAmountAndMeta(tx, transactionData, toAccount);
        useAmount = result.amount;
        useCurrency = result.currency;
        conversionMeta = result.metadata;
      }

      // Create the transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: useAmount,
          currency: useCurrency,
          type: transactionData.type,
          description: transactionData.description,
          reference,
          fromAccountId: transactionData.fromAccountId,
          toAccountId: transactionData.toAccountId,
          status: TransactionStatus.PENDING,
          metadata: conversionMeta,
        },
        include: {
          fromAccount: true,
          toAccount: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Handle balance updates based on transaction type
      if (transactionData.type === TransactionType.DEPOSIT && transactionData.toAccountId) {
        await this.updateAccountBalance(tx, transactionData.toAccountId, useAmount, 'add');
      } else if (transactionData.type === TransactionType.WITHDRAWAL && transactionData.fromAccountId) {
        await this.updateAccountBalance(tx, transactionData.fromAccountId, transactionData.amount, 'subtract');
      }

      // Update transaction status to completed
      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.COMPLETED },
        include: {
          fromAccount: true,
          toAccount: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Transaction Completed',
          message: `Your ${transactionData.type.toLowerCase()} of ${transactionData.currency || 'USD'} ${transactionData.amount} has been completed.`,
          type: 'success',
        },
      });

      return updatedTransaction;
    });
  }

  async transferBetweenAccounts(userId: string, transferData: TransferRequest) {
    // KYC check
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.kycStatus !== 'APPROVED') {
      throw new Error('KYC not approved. Please complete KYC verification to perform transfers.');
    }

    const reference = generateTransactionReference();

    return prisma.$transaction(async (tx) => {
      // Verify accounts exist and belong to user or are valid for transfer
      const fromAccount = await tx.account.findUnique({
        where: { id: transferData.fromAccountId },
      });

      const toAccount = await tx.account.findUnique({
        where: { id: transferData.toAccountId },
      });

      if (!fromAccount || !toAccount) {
        throw new Error('Invalid account(s)');
      }

      if (fromAccount.userId !== userId) {
        throw new Error('Unauthorized access to source account');
      }

      // Check sufficient balance
      const currentBalance = parseFloat(fromAccount.balance.toString());
      if (currentBalance < transferData.amount) {
        throw new Error('Insufficient funds');
      }

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: transferData.amount,
          currency: transferData.currency || 'USD',
          type: TransactionType.TRANSFER,
          description: transferData.description,
          reference,
          fromAccountId: transferData.fromAccountId,
          toAccountId: transferData.toAccountId,
          status: TransactionStatus.PENDING,
        },
      });

      // Update balances
      await this.updateAccountBalance(tx, transferData.fromAccountId, transferData.amount, 'subtract');
      await this.updateAccountBalance(tx, transferData.toAccountId, transferData.amount, 'add');

      // Update transaction status
      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.COMPLETED },
        include: {
          fromAccount: true,
          toAccount: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create notifications for both parties if different users
      await tx.notification.create({
        data: {
          userId,
          title: 'Transfer Completed',
          message: `Transfer of ${transferData.currency || 'USD'} ${transferData.amount} has been completed.`,
          type: 'success',
        },
      });

      if (toAccount.userId !== userId) {
        await tx.notification.create({
          data: {
            userId: toAccount.userId,
            title: 'Transfer Received',
            message: `You received ${transferData.currency || 'USD'} ${transferData.amount} from ${fromAccount.accountNumber}.`,
            type: 'success',
          },
        });
      }

      return updatedTransaction;
    });
  }

  async processPayment(userId: string, paymentData: PaymentRequest) {
    // KYC check
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.kycStatus !== 'APPROVED') {
      throw new Error('KYC not approved. Please complete KYC verification to process payments.');
    }

    const reference = generateTransactionReference();

    return prisma.$transaction(async (tx) => {
      // Verify account
      const account = await tx.account.findUnique({
        where: { id: paymentData.accountId, userId },
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Check sufficient balance
      const currentBalance = parseFloat(account.balance.toString());
      if (currentBalance < paymentData.amount) {
        throw new Error('Insufficient funds');
      }

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: paymentData.amount,
          currency: paymentData.currency || 'USD',
          type: TransactionType.PAYMENT,
          description: paymentData.description,
          reference,
          fromAccountId: paymentData.accountId,
          status: TransactionStatus.PENDING,
          metadata: {
            recipientDetails: paymentData.recipientDetails,
          },
        },
      });

      // Update balance
      await this.updateAccountBalance(tx, paymentData.accountId, paymentData.amount, 'subtract');

      // Simulate payment processing (in real app, this would call external payment provider)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update transaction status
      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.COMPLETED },
        include: {
          fromAccount: true,
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Create notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Payment Completed',
          message: `Payment of ${paymentData.currency || 'USD'} ${paymentData.amount} to ${paymentData.recipientDetails.name} has been completed.`,
          type: 'success',
        },
      });

      return updatedTransaction;
    });
  }

  async getTransactions(userId: string, filters: TransactionFilters, page: number, limit: number, skip: number) {
    const where: any = { userId };

    if (filters.accountId) {
      where.OR = [
        { fromAccountId: filters.accountId },
        { toAccountId: filters.accountId },
      ];
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(filters.fromDate);
      }
      if (filters.toDate) {
        where.createdAt.lte = new Date(filters.toDate);
      }
    }

    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) {
        where.amount.gte = parseFloat(filters.minAmount);
      }
      if (filters.maxAmount) {
        where.amount.lte = parseFloat(filters.maxAmount);
      }
    }

    const orderBy: any = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          fromAccount: true,
          toAccount: true,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async getTransactionById(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const transaction = await prisma.transaction.findUnique({
      where,
      include: {
        fromAccount: true,
        toAccount: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return transaction;
  }

  async getTransactionAnalytics(userId: string, period: string, startDate?: string, endDate?: string): Promise<TransactionAnalytics> {
    const where: any = { userId };

    // Set date range based on period
    const now = new Date();
    let dateFilter: any = {};

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      switch (period) {
        case 'day':
          dateFilter = {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          };
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          dateFilter = { gte: weekStart };
          break;
        case 'month':
          dateFilter = {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          };
          break;
        case 'year':
          dateFilter = {
            gte: new Date(now.getFullYear(), 0, 1),
          };
          break;
      }
    }

    where.createdAt = dateFilter;

    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        type: true,
        status: true,
        createdAt: true,
      },
    });

    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const averageTransactionSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    const transactionsByType = transactions.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<TransactionType, number>);

    const transactionsByStatus = transactions.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<TransactionStatus, number>);

    // Group by day for daily volume
    const dailyVolume = transactions.reduce((acc, t) => {
      const date = t.createdAt.toISOString().split('T')[0];
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.volume += parseFloat(t.amount.toString());
        existing.count += 1;
      } else {
        acc.push({
          date,
          volume: parseFloat(t.amount.toString()),
          count: 1,
        });
      }
      return acc;
    }, [] as Array<{ date: string; volume: number; count: number }>);

    return {
      totalTransactions,
      totalVolume,
      averageTransactionSize,
      transactionsByType,
      transactionsByStatus,
      dailyVolume,
    };
  }

  private async updateAccountBalance(tx: any, accountId: string, amount: number, operation: 'add' | 'subtract') {
    const account = await tx.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const currentBalance = parseFloat(account.balance.toString());
    let newBalance: number;

    if (operation === 'add') {
      newBalance = currentBalance + amount;
    } else {
      newBalance = currentBalance - amount;
      if (newBalance < 0) {
        throw new Error('Insufficient funds');
      }
    }

    return tx.account.update({
      where: { id: accountId },
      data: { balance: newBalance },
    });
  }
}
