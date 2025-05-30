import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
export declare class AccountController {
    private accountService;
    createAccount: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getUserAccounts: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getAccountById: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getAccountByNumber: (req: Request, res: Response) => Promise<void>;
    deactivateAccount: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getAccountSummary: (req: AuthenticatedRequest, res: Response) => Promise<void>;
    getAllAccounts: (req: Request, res: Response) => Promise<void>;
    getAccountByIdAdmin: (req: Request, res: Response) => Promise<void>;
    deactivateAccountAdmin: (req: Request, res: Response) => Promise<void>;
}
//# sourceMappingURL=accountController.d.ts.map