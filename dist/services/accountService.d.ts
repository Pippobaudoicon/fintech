import { CreateAccountRequest, AccountSummary } from '../types';
export declare class AccountService {
    createAccount(userId: string, accountData: CreateAccountRequest): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        currency: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountNumber: string;
        accountType: import(".prisma/client").$Enums.AccountType;
        balance: import("@prisma/client/runtime/library").Decimal;
        userId: string;
    }>;
    getUserAccounts(userId: string): Promise<({
        _count: {
            transactionsFrom: number;
            transactionsTo: number;
        };
    } & {
        currency: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountNumber: string;
        accountType: import(".prisma/client").$Enums.AccountType;
        balance: import("@prisma/client/runtime/library").Decimal;
        userId: string;
    })[]>;
    getAccountById(id: string, userId?: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        transactionsFrom: {
            type: import(".prisma/client").$Enums.TransactionType;
            status: import(".prisma/client").$Enums.TransactionStatus;
            currency: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            description: string | null;
            reference: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            fromAccountId: string | null;
            toAccountId: string | null;
        }[];
        transactionsTo: {
            type: import(".prisma/client").$Enums.TransactionType;
            status: import(".prisma/client").$Enums.TransactionStatus;
            currency: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            description: string | null;
            reference: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            fromAccountId: string | null;
            toAccountId: string | null;
        }[];
    } & {
        currency: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountNumber: string;
        accountType: import(".prisma/client").$Enums.AccountType;
        balance: import("@prisma/client/runtime/library").Decimal;
        userId: string;
    }>;
    getAccountByNumber(accountNumber: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        currency: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountNumber: string;
        accountType: import(".prisma/client").$Enums.AccountType;
        balance: import("@prisma/client/runtime/library").Decimal;
        userId: string;
    }>;
    updateAccountBalance(accountId: string, amount: number, operation: 'add' | 'subtract'): Promise<{
        currency: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountNumber: string;
        accountType: import(".prisma/client").$Enums.AccountType;
        balance: import("@prisma/client/runtime/library").Decimal;
        userId: string;
    }>;
    deactivateAccount(id: string, userId?: string): Promise<void>;
    getAccountSummary(userId: string): Promise<AccountSummary>;
    getAllAccounts(page: number, limit: number, skip: number): Promise<{
        accounts: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            _count: {
                transactionsFrom: number;
                transactionsTo: number;
            };
        } & {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        })[];
        total: number;
    }>;
}
//# sourceMappingURL=accountService.d.ts.map