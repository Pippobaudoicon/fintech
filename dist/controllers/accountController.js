"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountController = void 0;
const accountService_1 = require("../services/accountService");
const helpers_1 = require("../utils/helpers");
const logger_1 = __importDefault(require("../utils/logger"));
class AccountController {
    constructor() {
        this.accountService = new accountService_1.AccountService();
        this.createAccount = async (req, res) => {
            try {
                const account = await this.accountService.createAccount(req.user.id, req.body);
                res.status(201).json((0, helpers_1.successResponse)('Account created successfully', account));
            }
            catch (error) {
                logger_1.default.error('Create account error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Account creation failed', error.message));
            }
        };
        this.getUserAccounts = async (req, res) => {
            try {
                const accounts = await this.accountService.getUserAccounts(req.user.id);
                res.json((0, helpers_1.successResponse)('Accounts retrieved successfully', accounts));
            }
            catch (error) {
                logger_1.default.error('Get user accounts error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve accounts', error.message));
            }
        };
        this.getAccountById = async (req, res) => {
            try {
                const account = await this.accountService.getAccountById(req.params.id, req.user.id);
                res.json((0, helpers_1.successResponse)('Account retrieved successfully', account));
            }
            catch (error) {
                logger_1.default.error('Get account by ID error:', error);
                res.status(404).json((0, helpers_1.errorResponse)('Account not found', error.message));
            }
        };
        this.getAccountByNumber = async (req, res) => {
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
                res.json((0, helpers_1.successResponse)('Account found', publicAccountInfo));
            }
            catch (error) {
                logger_1.default.error('Get account by number error:', error);
                res.status(404).json((0, helpers_1.errorResponse)('Account not found', error.message));
            }
        };
        this.deactivateAccount = async (req, res) => {
            try {
                await this.accountService.deactivateAccount(req.params.id, req.user.id);
                res.json((0, helpers_1.successResponse)('Account deactivated successfully'));
            }
            catch (error) {
                logger_1.default.error('Deactivate account error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Failed to deactivate account', error.message));
            }
        };
        this.getAccountSummary = async (req, res) => {
            try {
                const summary = await this.accountService.getAccountSummary(req.user.id);
                res.json((0, helpers_1.successResponse)('Account summary retrieved successfully', summary));
            }
            catch (error) {
                logger_1.default.error('Get account summary error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve account summary', error.message));
            }
        };
        // Admin endpoints
        this.getAllAccounts = async (req, res) => {
            try {
                const { page, limit, skip } = (0, helpers_1.parsePageAndLimit)(req.query.page, req.query.limit);
                const { accounts, total } = await this.accountService.getAllAccounts(page, limit, skip);
                const pagination = (0, helpers_1.calculatePagination)(total, page, limit);
                res.json((0, helpers_1.successResponse)('Accounts retrieved successfully', accounts, pagination));
            }
            catch (error) {
                logger_1.default.error('Get all accounts error:', error);
                res.status(500).json((0, helpers_1.errorResponse)('Failed to retrieve accounts', error.message));
            }
        };
        this.getAccountByIdAdmin = async (req, res) => {
            try {
                const account = await this.accountService.getAccountById(req.params.id);
                res.json((0, helpers_1.successResponse)('Account retrieved successfully', account));
            }
            catch (error) {
                logger_1.default.error('Get account by ID (admin) error:', error);
                res.status(404).json((0, helpers_1.errorResponse)('Account not found', error.message));
            }
        };
        this.deactivateAccountAdmin = async (req, res) => {
            try {
                await this.accountService.deactivateAccount(req.params.id);
                res.json((0, helpers_1.successResponse)('Account deactivated successfully'));
            }
            catch (error) {
                logger_1.default.error('Deactivate account (admin) error:', error);
                res.status(400).json((0, helpers_1.errorResponse)('Failed to deactivate account', error.message));
            }
        };
    }
}
exports.AccountController = AccountController;
//# sourceMappingURL=accountController.js.map