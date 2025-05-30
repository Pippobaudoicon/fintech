import { ApiResponse } from '../types';
export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateToken: (payload: object) => string;
export declare const verifyToken: (token: string) => any;
export declare const generateAccountNumber: () => string;
export declare const generateTransactionReference: () => string;
export declare const formatCurrency: (amount: number, currency?: string) => string;
export declare const successResponse: <T>(message: string, data?: T, meta?: any) => ApiResponse<T>;
export declare const errorResponse: (message: string, error?: string) => ApiResponse;
export declare const parsePageAndLimit: (page?: string, limit?: string) => {
    page: number;
    limit: number;
    skip: number;
};
export declare const calculatePagination: (total: number, page: number, limit: number) => {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};
export declare const validateEmail: (email: string) => boolean;
export declare const sanitizeUser: (user: any) => any;
//# sourceMappingURL=helpers.d.ts.map