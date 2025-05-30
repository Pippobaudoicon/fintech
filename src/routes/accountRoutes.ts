import { Router } from 'express';
import { AccountController } from '../controllers/accountController';
import { authenticate, authorize, auditLog } from '../middleware/auth';
import { validate } from '../middleware';
import { createAccountValidation, paginationValidation, idValidation } from '../validators';

const router = Router();
const accountController = new AccountController();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.post('/', createAccountValidation, validate, auditLog('CREATE', 'ACCOUNT'), accountController.createAccount);
router.get('/my-accounts', accountController.getUserAccounts);
router.get('/summary', accountController.getAccountSummary);
router.get('/:id', idValidation, validate, accountController.getAccountById);
router.get('/:id/balance', idValidation, validate, accountController.getAccountBalance);
router.get('/:id/transactions', idValidation, validate, paginationValidation, accountController.getAccountTransactions);
router.delete('/:id', idValidation, validate, auditLog('DEACTIVATE', 'ACCOUNT'), accountController.deactivateAccount);

// Public account lookup (limited info)
router.get('/lookup/:accountNumber', accountController.getAccountByNumber);

// Admin routes
router.use(authorize('ADMIN'));
router.get('/admin/all', paginationValidation, validate, accountController.getAllAccounts);
router.get('/admin/:id', idValidation, validate, accountController.getAccountByIdAdmin);
router.delete('/admin/:id', idValidation, validate, auditLog('ADMIN_DEACTIVATE', 'ACCOUNT'), accountController.deactivateAccountAdmin);

export default router;
