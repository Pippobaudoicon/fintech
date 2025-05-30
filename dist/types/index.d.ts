import { Request } from 'express';
import { UserRole, AccountType, TransactionType, TransactionStatus } from '@prisma/client';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: UserRole;
    };
}
export interface CreateUserRequest {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    phone?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface CreateAccountRequest {
    accountType: AccountType;
    currency?: string;
}
export interface TransactionRequest {
    amount: number;
    currency?: string;
    type: TransactionType;
    description?: string;
    fromAccountId?: string;
    toAccountId?: string;
    recipientEmail?: string;
}
export interface TransferRequest {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    description?: string;
    currency?: string;
}
export interface PaymentRequest {
    accountId: string;
    amount: number;
    description: string;
    recipientDetails: {
        name: string;
        email?: string;
        bankAccount?: string;
    };
    currency?: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}
export interface PaginationQuery {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface TransactionFilters extends PaginationQuery {
    accountId?: string;
    type?: TransactionType;
    status?: TransactionStatus;
    fromDate?: string;
    toDate?: string;
    minAmount?: string;
    maxAmount?: string;
}
export interface AnalyticsQuery {
    period: 'day' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
    accountId?: string;
}
export interface AccountSummary {
    totalBalance: number;
    totalAccounts: number;
    accountsByType: Record<AccountType, number>;
    recentTransactions: number;
}
export interface TransactionAnalytics {
    totalTransactions: number;
    totalVolume: number;
    averageTransactionSize: number;
    transactionsByType: Record<TransactionType, number>;
    transactionsByStatus: Record<TransactionStatus, number>;
    dailyVolume: Array<{
        date: string;
        volume: number;
        count: number;
    }>;
}
//# sourceMappingURL=index.d.ts.map