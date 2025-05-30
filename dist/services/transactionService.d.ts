import { TransactionRequest, TransferRequest, PaymentRequest, TransactionFilters, TransactionAnalytics } from '../types';
export declare class TransactionService {
    private accountService;
    createTransaction(userId: string, transactionData: TransactionRequest): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        fromAccount: {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        } | null;
        toAccount: {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        } | null;
    } & {
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
    }>;
    transferBetweenAccounts(userId: string, transferData: TransferRequest): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        fromAccount: {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        } | null;
        toAccount: {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        } | null;
    } & {
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
    }>;
    processPayment(userId: string, paymentData: PaymentRequest): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        fromAccount: {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        } | null;
    } & {
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
    }>;
    getTransactions(userId: string, filters: TransactionFilters, page: number, limit: number, skip: number): Promise<{
        transactions: ({
            fromAccount: {
                currency: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                accountNumber: string;
                accountType: import(".prisma/client").$Enums.AccountType;
                balance: import("@prisma/client/runtime/library").Decimal;
                userId: string;
            } | null;
            toAccount: {
                currency: string;
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                accountNumber: string;
                accountType: import(".prisma/client").$Enums.AccountType;
                balance: import("@prisma/client/runtime/library").Decimal;
                userId: string;
            } | null;
        } & {
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
        })[];
        total: number;
    }>;
    getTransactionById(id: string, userId?: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
        fromAccount: {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        } | null;
        toAccount: {
            currency: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            accountNumber: string;
            accountType: import(".prisma/client").$Enums.AccountType;
            balance: import("@prisma/client/runtime/library").Decimal;
            userId: string;
        } | null;
    } & {
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
    }>;
    getTransactionAnalytics(userId: string, period: string, startDate?: string, endDate?: string): Promise<TransactionAnalytics>;
    private updateAccountBalance;
}
//# sourceMappingURL=transactionService.d.ts.map