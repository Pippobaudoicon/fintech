import { Request, Response } from 'express';
import { AccountService } from '../services/accountService';
import { AuthenticatedRequest } from '../types';
import { successResponse, errorResponse, parsePageAndLimit, calculatePagination } from '../utils/helpers';
import logger from '../utils/logger';

export class AccountController {
  private accountService = new AccountService();

  createAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const account = await this.accountService.createAccount(req.user!.id, req.body);
      res.status(201).json(successResponse('Account created successfully', account));
    } catch (error: any) {
      logger.error('Create account error:', error);
      res.status(400).json(errorResponse('Account creation failed', error.message));
    }
  };

  getUserAccounts = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const accounts = await this.accountService.getUserAccounts(req.user!.id);
      res.json(successResponse('Accounts retrieved successfully', accounts));
    } catch (error: any) {
      logger.error('Get user accounts error:', error);
      res.status(500).json(errorResponse('Failed to retrieve accounts', error.message));
    }
  };

  getAccountById = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const account = await this.accountService.getAccountById(req.params.id, req.user!.id);
      res.json(successResponse('Account retrieved successfully', account));
    } catch (error: any) {
      logger.error('Get account by ID error:', error);
      res.status(404).json(errorResponse('Account not found', error.message));
    }
  };

  getAccountByNumber = async (req: Request, res: Response) => {
    try {
      const account = await this.accountService.getAccountByNumber(req.params.accountNumber);
      // Return limited info for security
      const publicAccountInfo = {
        id: account.id,
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        currency: account.currency,
        user: {
          firstName: account.user.firstName,
          lastName: account.user.lastName,
        },
      };
      res.json(successResponse('Account found', publicAccountInfo));
    } catch (error: any) {
      logger.error('Get account by number error:', error);
      res.status(404).json(errorResponse('Account not found', error.message));
    }
  };

  deactivateAccount = async (req: AuthenticatedRequest, res: Response) => {
    try {
      await this.accountService.deactivateAccount(req.params.id, req.user!.id);
      res.json(successResponse('Account deactivated successfully'));
    } catch (error: any) {
      logger.error('Deactivate account error:', error);
      res.status(400).json(errorResponse('Failed to deactivate account', error.message));
    }
  };

  getAccountSummary = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const summary = await this.accountService.getAccountSummary(req.user!.id);
      res.json(successResponse('Account summary retrieved successfully', summary));
    } catch (error: any) {
      logger.error('Get account summary error:', error);
      res.status(500).json(errorResponse('Failed to retrieve account summary', error.message));
    }
  };

  getAccountBalance = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const balance = await this.accountService.getAccountBalance(req.params.id, req.user!.id);
      res.json(successResponse('Account balance retrieved successfully', balance));
    } catch (error: any) {
      logger.error('Get account balance error:', error);
      res.status(404).json(errorResponse('Account not found', error.message));
    }
  };

  getAccountTransactions = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, skip } = parsePageAndLimit(req.query.page as string, req.query.limit as string);
      const { transactions, total } = await this.accountService.getAccountTransactions(
        req.params.id, 
        req.user!.id, 
        page, 
        limit, 
        skip
      );
      const pagination = calculatePagination(total, page, limit);

      res.json(successResponse('Account transactions retrieved successfully', transactions, pagination));
    } catch (error: any) {
      logger.error('Get account transactions error:', error);
      res.status(404).json(errorResponse('Account not found', error.message));
    }
  };

  // Admin endpoints
  getAllAccounts = async (req: Request, res: Response) => {
    try {
      const { page, limit, skip } = parsePageAndLimit(req.query.page as string, req.query.limit as string);
      const { accounts, total } = await this.accountService.getAllAccounts(page, limit, skip);
      const pagination = calculatePagination(total, page, limit);

      res.json(successResponse('Accounts retrieved successfully', accounts, pagination));
    } catch (error: any) {
      logger.error('Get all accounts error:', error);
      res.status(500).json(errorResponse('Failed to retrieve accounts', error.message));
    }
  };

  getAccountByIdAdmin = async (req: Request, res: Response) => {
    try {
      const account = await this.accountService.getAccountById(req.params.id);
      res.json(successResponse('Account retrieved successfully', account));
    } catch (error: any) {
      logger.error('Get account by ID (admin) error:', error);
      res.status(404).json(errorResponse('Account not found', error.message));
    }
  };

  deactivateAccountAdmin = async (req: Request, res: Response) => {
    try {
      await this.accountService.deactivateAccount(req.params.id);
      res.json(successResponse('Account deactivated successfully'));
    } catch (error: any) {
      logger.error('Deactivate account (admin) error:', error);
      res.status(400).json(errorResponse('Failed to deactivate account', error.message));
    }
  };
}
