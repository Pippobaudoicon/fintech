"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const accountController_1 = require("../controllers/accountController");
const auth_1 = require("../middleware/auth");
const middleware_1 = require("../middleware");
const validators_1 = require("../validators");
const router = (0, express_1.Router)();
const accountController = new accountController_1.AccountController();
// All routes require authentication
router.use(auth_1.authenticate);
// Customer routes
router.post('/', validators_1.createAccountValidation, middleware_1.validate, (0, auth_1.auditLog)('CREATE', 'ACCOUNT'), accountController.createAccount);
router.get('/my-accounts', accountController.getUserAccounts);
router.get('/summary', accountController.getAccountSummary);
router.get('/:id', validators_1.idValidation, middleware_1.validate, accountController.getAccountById);
router.delete('/:id', validators_1.idValidation, middleware_1.validate, (0, auth_1.auditLog)('DEACTIVATE', 'ACCOUNT'), accountController.deactivateAccount);
// Public account lookup (limited info)
router.get('/lookup/:accountNumber', accountController.getAccountByNumber);
// Admin routes
router.use((0, auth_1.authorize)('ADMIN'));
router.get('/admin/all', validators_1.paginationValidation, middleware_1.validate, accountController.getAllAccounts);
router.get('/admin/:id', validators_1.idValidation, middleware_1.validate, accountController.getAccountByIdAdmin);
router.delete('/admin/:id', validators_1.idValidation, middleware_1.validate, (0, auth_1.auditLog)('ADMIN_DEACTIVATE', 'ACCOUNT'), accountController.deactivateAccountAdmin);
exports.default = router;
//# sourceMappingURL=accountRoutes.js.map