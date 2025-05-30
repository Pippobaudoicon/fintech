import prisma from '../config/database';
import { generateAccountNumber } from '../utils/helpers';
import { CreateAccountRequest, AccountSummary } from '../types';
import { AccountType } from '@prisma/client';

export class AccountService {
  async createAccount(userId: string, accountData: CreateAccountRequest) {
    const accountNumber = generateAccountNumber();
    
    const account = await prisma.account.create({
      data: {
        userId,
        accountNumber,
        accountType: accountData.accountType,
        currency: accountData.currency || 'USD',
      },
      include: {
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
    await prisma.notification.create({
      data: {
        userId,
        title: 'New Account Created',
        message: `Your ${accountData.accountType.toLowerCase()} account has been successfully created.`,
        type: 'success',
      },
    });

    return account;
  }

  async getUserAccounts(userId: string) {
    return prisma.account.findMany({
      where: { userId, isActive: true },
      include: {
        _count: {
          select: {
            transactionsFrom: true,
            transactionsTo: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAccountById(id: string, userId?: string) {
    const where: any = { id, isActive: true };
    if (userId) where.userId = userId;

    const account = await prisma.account.findUnique({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        transactionsFrom: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        transactionsTo: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  async getAccountByNumber(accountNumber: string) {
    const account = await prisma.account.findUnique({
      where: { accountNumber, isActive: true },
      include: {
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

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  async updateAccountBalance(accountId: string, amount: number, operation: 'add' | 'subtract') {
    const account = await prisma.account.findUnique({
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

    return prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance },
    });
  }

  async deactivateAccount(id: string, userId?: string) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const account = await prisma.account.findUnique({ where });
    if (!account) {
      throw new Error('Account not found');
    }

    const balance = parseFloat(account.balance.toString());
    if (balance > 0) {
      throw new Error('Cannot deactivate account with positive balance');
    }

    await prisma.account.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getAccountSummary(userId: string): Promise<AccountSummary> {
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
    });

    const totalBalance = accounts.reduce(
      (sum, account) => sum + parseFloat(account.balance.toString()),
      0
    );

    const accountsByType = accounts.reduce((acc, account) => {
      acc[account.accountType] = (acc[account.accountType] || 0) + 1;
      return acc;
    }, {} as Record<AccountType, number>);

    const recentTransactions = await prisma.transaction.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    return {
      totalBalance,
      totalAccounts: accounts.length,
      accountsByType,
      recentTransactions,
    };
  }

  async getAllAccounts(page: number, limit: number, skip: number) {
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              transactionsFrom: true,
              transactionsTo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.account.count(),
    ]);

    return { accounts, total };
  }

  async getAccountBalance(accountId: string, userId: string) {
    const account = await prisma.account.findUnique({
      where: { 
        id: accountId, 
        userId: userId,
        isActive: true 
      },
      select: {
        id: true,
        accountNumber: true,
        accountType: true,
        balance: true,
        currency: true,
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      accountId: account.id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: parseFloat(account.balance.toString()),
      currency: account.currency,
    };
  }

  async getAccountTransactions(accountId: string, userId: string, page: number, limit: number, skip: number) {
    // First verify the account belongs to the user
    const account = await prisma.account.findUnique({
      where: { 
        id: accountId, 
        userId: userId,
        isActive: true 
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Get transactions where this account is either source or destination
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [
            { fromAccountId: accountId },
            { toAccountId: accountId },
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromAccount: {
            select: {
              id: true,
              accountNumber: true,
              accountType: true,
            },
          },
          toAccount: {
            select: {
              id: true,
              accountNumber: true,
              accountType: true,
            },
          },
        },
      }),
      prisma.transaction.count({
        where: {
          OR: [
            { fromAccountId: accountId },
            { toAccountId: accountId },
          ],
        },
      }),
    ]);

    return { transactions, total };
  }
}
