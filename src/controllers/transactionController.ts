import { Request, Response } from 'express';
import { TransactionService } from '../services/transactionService';
import { AuthenticatedRequest, TransactionFilters, AnalyticsQuery } from '../types';
import { successResponse, errorResponse, parsePageAndLimit, calculatePagination } from '../utils/helpers';
import logger from '../utils/logger';
import { cacheResponse, transactionListCacheKey } from '../middleware/cache';

export class TransactionController {
  private transactionService = new TransactionService();
  createTransaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const transaction = await this.transactionService.createTransaction(req.user!.id, req.body);
      res.status(201).json(successResponse('Transaction created successfully', transaction));
    } catch (error: any) {
      logger.error('Create transaction error:', error);
      res.status(400).json(errorResponse('Transaction failed', error.message));
    }
  };

  transferBetweenAccounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const transaction = await this.transactionService.transferBetweenAccounts(req.user!.id, req.body);
      res.status(201).json(successResponse('Transfer completed successfully', transaction));
    } catch (error: any) {
      logger.error('Transfer error:', error);
      res.status(400).json(errorResponse('Transfer failed', error.message));
    }
  };

  processPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const transaction = await this.transactionService.processPayment(req.user!.id, req.body);
      res.status(201).json(successResponse('Payment processed successfully', transaction));
    } catch (error: any) {
      logger.error('Payment error:', error);
      res.status(400).json(errorResponse('Payment failed', error.message));
    }
  };
  getTransactions = [
    cacheResponse(transactionListCacheKey, 60),
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      try {
        const { page, limit, skip } = parsePageAndLimit(req.query.page as string, req.query.limit as string);
        const filters: TransactionFilters = {
          accountId: req.query.accountId as string,
          type: req.query.type as any,
          status: req.query.status as any,
          fromDate: req.query.fromDate as string,
          toDate: req.query.toDate as string,
          minAmount: req.query.minAmount as string,
          maxAmount: req.query.maxAmount as string,
          sortBy: req.query.sortBy as string,
          sortOrder: req.query.sortOrder as 'asc' | 'desc',
        };

        const { transactions, total } = await this.transactionService.getTransactions(
          req.user!.id,
          filters,
          page,
          limit,
          skip
        );
        const pagination = calculatePagination(total, page, limit);

        res.json(successResponse('Transactions retrieved successfully', transactions, pagination));
      } catch (error: any) {
        logger.error('Get transactions error:', error);
        res.status(500).json(errorResponse('Failed to retrieve transactions', error.message));
      }
    }
  ];

  getTransactionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const transaction = await this.transactionService.getTransactionById(req.params.id, req.user!.id);
      res.json(successResponse('Transaction retrieved successfully', transaction));
    } catch (error: any) {
      logger.error('Get transaction by ID error:', error);
      res.status(404).json(errorResponse('Transaction not found', error.message));
    }
  };
  getTransactionAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
            const { period, startDate, endDate } = req.query;
      
      if (!period || typeof period !== 'string') {
        res.status(400).json(errorResponse('Period is required'));
        return;
      }

      const validPeriods = ['day', 'week', 'month', 'year'];
      if (!validPeriods.includes(period)) {
        res.status(400).json(errorResponse('Invalid period. Must be one of: day, week, month, year'));
        return;
      }

      const analytics = await this.transactionService.getTransactionAnalytics(
        req.user!.id,
        period as 'day' | 'week' | 'month' | 'year',
        typeof startDate === 'string' ? startDate : undefined,
        typeof endDate === 'string' ? endDate : undefined
      );

      res.json(successResponse('Transaction analytics retrieved successfully', analytics));
    } catch (error: any) {
      logger.error('Get transaction analytics error:', error);
      res.status(500).json(errorResponse('Failed to retrieve analytics', error.message));
    }
  };
  // Admin endpoints
  getAllTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page, limit, skip } = parsePageAndLimit(req.query.page as string, req.query.limit as string);
      const filters: TransactionFilters = {
        accountId: req.query.accountId as string,
        type: req.query.type as any,
        status: req.query.status as any,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        minAmount: req.query.minAmount as string,
        maxAmount: req.query.maxAmount as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      // For admin, we need to modify the service to not filter by userId
      // This is a simplified version - in production, you'd want a separate admin service method
      res.status(501).json(errorResponse('Admin transaction listing not implemented yet'));
    } catch (error: any) {
      logger.error('Get all transactions (admin) error:', error);
      res.status(500).json(errorResponse('Failed to retrieve transactions', error.message));
    }
  };

  getTransactionByIdAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
      const transaction = await this.transactionService.getTransactionById(req.params.id);
      res.json(successResponse('Transaction retrieved successfully', transaction));
    } catch (error: any) {
            logger.error('Get transaction by ID (admin) error:', error);
      res.status(404).json(errorResponse('Transaction not found', error.message));
    }
  };
}

export const transactionController = new TransactionController();
