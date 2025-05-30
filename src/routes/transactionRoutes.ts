import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authenticate, authorize, auditLog } from '../middleware/auth';
import { validate, createRateLimit } from '../middleware';
import { 
  transactionValidation, 
  transferValidation, 
  paymentValidation,
  paginationValidation,
  dateRangeValidation,
  idValidation 
} from '../validators';

const router = Router();
const transactionController = new TransactionController();

// All routes require authentication
router.use(authenticate);

// Transaction routes with rate limiting for financial operations
router.post(
  '/',
  createRateLimit(60 * 1000, 10), // 10 transactions per minute
  transactionValidation,
  validate,
  auditLog('CREATE', 'TRANSACTION'),
  transactionController.createTransaction
);

router.post(
  '/transfer',
  createRateLimit(60 * 1000, 5), // 5 transfers per minute
  transferValidation,
  validate,
  auditLog('TRANSFER', 'TRANSACTION'),
  transactionController.transferBetweenAccounts
);

router.post(
  '/payment',
  createRateLimit(60 * 1000, 3), // 3 payments per minute
  paymentValidation,
  validate,
  auditLog('PAYMENT', 'TRANSACTION'),
  transactionController.processPayment
);

// Query routes
router.get(
  '/',
  paginationValidation,
  dateRangeValidation,
  validate,
  transactionController.getTransactions
);

router.get(
  '/analytics',
  dateRangeValidation,
  validate,
  transactionController.getTransactionAnalytics
);

router.get(
  '/:id',
  idValidation,
  validate,
  transactionController.getTransactionById
);

// Admin routes
router.use(authorize('ADMIN'));
router.get('/admin/all', paginationValidation, validate, transactionController.getAllTransactions);
router.get('/admin/:id', idValidation, validate, transactionController.getTransactionByIdAdmin);

export default router;
