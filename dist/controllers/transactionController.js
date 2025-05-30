"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionController = exports.TransactionController = void 0;
const transactionService_1 = require("../services/transactionService");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class TransactionController {
    constructor() {
        this.transactionService = new transactionService_1.TransactionService();
        this.createTransaction = async (req, res) => {
            try {
                const transaction = await this.transactionService.createTransaction(req.user.id, req.body);
                res.status(201).json((0, helpers_1.successResponse)('Transaction created successfully', transaction));
            }
            catch (error) {
                logger_1.default.error('Create transaction error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Transaction failed', error.message));
            }
        };
        this.transferBetweenAccounts = async (req, res) => {
            try {
                const transaction = await this.transactionService.transferBetweenAccounts(req.user.id, req.body);
                res.status(201).json((0, helpers_1.successResponse)('Transfer completed successfully', transaction));
            }
            catch (error) {
                logger_1.default.error('Transfer error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Transfer failed', error.message));
            }
        };
        this.processPayment = async (req, res) => {
            try {
                const transaction = await this.transactionService.processPayment(req.user.id, req.body);
                res.status(201).json((0, helpers_1.successResponse)('Payment processed successfully', transaction));
            }
            catch (error) {
                logger_1.default.error('Payment error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Payment failed', error.message));
            }
        };
        this.getTransactions = async (req, res) => {
            try {
                const { page, limit, skip } = (0, helpers_1.parsePageAndLimit)(req.query.page, req.query.limit);
                const filters = {
                    accountId: req.query.accountId,
                    type: req.query.type,
                    status: req.query.status,
                    fromDate: req.query.fromDate,
                    toDate: req.query.toDate,
                    minAmount: req.query.minAmount,
                    maxAmount: req.query.maxAmount,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                };
                const { transactions, total } = await this.transactionService.getTransactions(req.user.id, filters, page, limit, skip);
                const pagination = (0, helpers_1.calculatePagination)(total, page, limit);
                res.json((0, helpers_1.successResponse)('Transactions retrieved successfully', transactions, pagination));
            }
            catch (error) {
                logger_1.default.error('Get transactions error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve transactions', error.message));
            }
        };
        this.getTransactionById = async (req, res) => {
            try {
                const transaction = await this.transactionService.getTransactionById(req.params.id, req.user.id);
                res.json((0, helpers_1.successResponse)('Transaction retrieved successfully', transaction));
            }
            catch (error) {
                logger_1.default.error('Get transaction by ID error:', error);
                res.status(404).json((0, helpers_1.errorResponse)('Transaction not found', error.message));
            }
        };
        this.getTransactionAnalytics = async (req, res) => {
            try {
                const { period, startDate, endDate } = req.query;
                if (!period || typeof period !== 'string') {
                    res.status(400).json((0, helpers_1.errorResponse)('Period is required'));
                    return;
                }
                const validPeriods = ['day', 'week', 'month', 'year'];
                if (!validPeriods.includes(period)) {
                    res.status(400).json((0, helpers_1.errorResponse)('Invalid period. Must be one of: day, week, month, year'));
                    return;
                }
                const analytics = await this.transactionService.getTransactionAnalytics(req.user.id, period, typeof startDate === 'string' ? startDate : undefined, typeof endDate === 'string' ? endDate : undefined);
                res.json((0, helpers_1.successResponse)('Transaction analytics retrieved successfully', analytics));
            }
            catch (error) {
                logger_1.default.error('Get transaction analytics error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve analytics', error.message));
            }
        };
        // Admin endpoints
        this.getAllTransactions = async (req, res) => {
            try {
                const { page, limit, skip } = (0, helpers_1.parsePageAndLimit)(req.query.page, req.query.limit);
                const filters = {
                    accountId: req.query.accountId,
                    type: req.query.type,
                    status: req.query.status,
                    fromDate: req.query.fromDate,
                    toDate: req.query.toDate,
                    minAmount: req.query.minAmount,
                    maxAmount: req.query.maxAmount,
                    sortBy: req.query.sortBy,
                    sortOrder: req.query.sortOrder,
                };
                // For admin, we need to modify the service to not filter by userId
                // This is a simplified version - in production, you'd want a separate admin service method
                res.status(501).json((0, helpers_1.errorResponse)('Admin transaction listing not implemented yet'));
            }
            catch (error) {
                logger_1.default.error('Get all transactions (admin) error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve transactions', error.message));
            }
        };
        this.getTransactionByIdAdmin = async (req, res) => {
            try {
                const transaction = await this.transactionService.getTransactionById(req.params.id);
                res.json((0, helpers_1.successResponse)('Transaction retrieved successfully', transaction));
            }
            catch (error) {
                logger_1.default.error('Get transaction by ID (admin) error:', error);
                res.status(404).json((0, helpers_1.errorResponse)('Transaction not found', error.message));
            }
        };
    }
}
exports.TransactionController = TransactionController;
exports.transactionController = new TransactionController();
//# sourceMappingURL=transactionController.js.map