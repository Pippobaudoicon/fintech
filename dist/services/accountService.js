"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountService = void 0;
const database_1 = __importDefault(require("../config/database"));
const helpers_1 = require("../utils/helpers");
class AccountService {
    async createAccount(userId, accountData) {
        const accountNumber = (0, helpers_1.generateAccountNumber)();
        const account = await database_1.default.account.create({
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
        await database_1.default.notification.create({
            data: {
                userId,
                title: 'New Account Created',
                message: `Your ${accountData.accountType.toLowerCase()} account has been successfully created.`,
                type: 'success',
            },
        });
        return account;
    }
    async getUserAccounts(userId) {
        return database_1.default.account.findMany({
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
    async getAccountById(id, userId) {
        const where = { id, isActive: true };
        if (userId)
            where.userId = userId;
        const account = await database_1.default.account.findUnique({
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
    async getAccountByNumber(accountNumber) {
        const account = await database_1.default.account.findUnique({
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
    async updateAccountBalance(accountId, amount, operation) {
        const account = await database_1.default.account.findUnique({
            where: { id: accountId },
        });
        if (!account) {
            throw new Error('Account not found');
        }
        const currentBalance = parseFloat(account.balance.toString());
        let newBalance;
        if (operation === 'add') {
            newBalance = currentBalance + amount;
        }
        else {
            newBalance = currentBalance - amount;
            if (newBalance < 0) {
                throw new Error('Insufficient funds');
            }
        }
        return database_1.default.account.update({
            where: { id: accountId },
            data: { balance: newBalance },
        });
    }
    async deactivateAccount(id, userId) {
        const where = { id };
        if (userId)
            where.userId = userId;
        const account = await database_1.default.account.findUnique({ where });
        if (!account) {
            throw new Error('Account not found');
        }
        const balance = parseFloat(account.balance.toString());
        if (balance > 0) {
            throw new Error('Cannot deactivate account with positive balance');
        }
        await database_1.default.account.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getAccountSummary(userId) {
        const accounts = await database_1.default.account.findMany({
            where: { userId, isActive: true },
        });
        const totalBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance.toString()), 0);
        const accountsByType = accounts.reduce((acc, account) => {
            acc[account.accountType] = (acc[account.accountType] || 0) + 1;
            return acc;
        }, {});
        const recentTransactions = await database_1.default.transaction.count({
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
    async getAllAccounts(page, limit, skip) {
        const [accounts, total] = await Promise.all([
            database_1.default.account.findMany({
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
            database_1.default.account.count(),
        ]);
        return { accounts, total };
    }
}
exports.AccountService = AccountService;
//# sourceMappingURL=accountService.js.map