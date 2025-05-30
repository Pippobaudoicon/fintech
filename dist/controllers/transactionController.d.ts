import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare class TransactionController {
    private transactionService;
    createTransaction: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    transferBetweenAccounts: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    processPayment: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getTransactions: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getTransactionById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getTransactionAnalytics: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getAllTransactions: (req: Request, res: Response) => Promise<void>;
    getTransactionByIdAdmin: (req: Request, res: Response) => Promise<void>;
}
export declare const transactionController: TransactionController;
//# sourceMappingURL=transactionController.d.ts.map