"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = require("../controllers/transactionController");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../validators");
const router = (0, express_1.Router)();
const transactionController = new transactionController_1.TransactionController();
// All routes require authentication
router.use(auth_1.authenticate);
// Transaction routes with rate limiting for financial operations
router.post('/', (0, middleware_1.createRateLimit)(60 * 1000, 10), // 10 transactions per minute
validators_1.transactionValidation, middleware_1.validate, (0, auth_1.auditLog)('CREATE', 'TRANSACTION'), transactionController.createTransaction);
router.post('/transfer', (0, middleware_1.createRateLimit)(60 * 1000, 5), // 5 transfers per minute
validators_1.transferValidation, middleware_1.validate, (0, auth_1.auditLog)('TRANSFER', 'TRANSACTION'), transactionController.transferBetweenAccounts);
router.post('/payment', (0, middleware_1.createRateLimit)(60 * 1000, 3), // 3 payments per minute
validators_1.paymentValidation, middleware_1.validate, (0, auth_1.auditLog)('PAYMENT', 'TRANSACTION'), transactionController.processPayment);
// Query routes
router.get('/', validators_1.paginationValidation, validators_1.dateRangeValidation, middleware_1.validate, transactionController.getTransactions);
router.get('/analytics', validators_1.dateRangeValidation, middleware_1.validate, transactionController.getTransactionAnalytics);
router.get('/:id', validators_1.idValidation, middleware_1.validate, transactionController.getTransactionById);
// Admin routes
router.use((0, auth_1.authorize)('ADMIN'));
router.get('/admin/all', validators_1.paginationValidation, middleware_1.validate, transactionController.getAllTransactions);
router.get('/admin/:id', validators_1.idValidation, middleware_1.validate, transactionController.getTransactionByIdAdmin);
exports.default = router;
//# sourceMappingURL=transactionRoutes.js.map