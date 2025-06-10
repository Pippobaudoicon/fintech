import { Router } from "express";
import { TransactionController } from "../controllers/transactionController";
import { authenticate, authorize, auditLog } from "../middleware/auth";
import { validate } from "../middleware";
import { createTransactionRateLimit } from "../middleware/rateLimit";
import { 
  transactionCacheMiddleware, 
  transactionCacheInvalidation 
} from "../middleware/cache";
import {
  transactionValidation,
  transferValidation,
  paymentValidation,
  paginationValidation,
  idValidation,
} from "../validators";

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *           description: Unique transaction identifier
 *         userId:
 *           type: string
 *           format: cuid
 *           description: User who initiated the transaction
 *         amount:
 *           type: number
 *           format: decimal
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Transaction currency
 *         type:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT]
 *           description: Type of transaction
 *         status:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELLED]
 *           description: Transaction status
 *         description:
 *           type: string
 *           description: Transaction description
 *         reference:
 *           type: string
 *           description: Unique transaction reference
 *         fromAccountId:
 *           type: string
 *           format: cuid
 *           description: Source account ID (for withdrawals/transfers)
 *         toAccountId:
 *           type: string
 *           format: cuid
 *           description: Destination account ID (for deposits/transfers)
 *         recipientDetails:
 *           type: object
 *           description: Payment recipient details
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Transaction creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         fromAccount:
 *           $ref: '#/components/schemas/Account'
 *         toAccount:
 *           $ref: '#/components/schemas/Account'
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     TransactionRequest:
 *       type: object
 *       required:
 *         - amount
 *         - type
 *       properties:
 *         amount:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Transaction currency
 *         type:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAWAL]
 *           description: Type of transaction
 *         description:
 *           type: string
 *           description: Optional transaction description
 *         fromAccountId:
 *           type: string
 *           format: cuid
 *           description: Source account ID (required for withdrawals)
 *         toAccountId:
 *           type: string
 *           format: cuid
 *           description: Destination account ID (required for deposits)
 *
 *     TransferRequest:
 *       type: object
 *       required:
 *         - amount
 *         - fromAccountId
 *         - toAccountId
 *       properties:
 *         amount:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *           description: Transfer amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Transfer currency
 *         fromAccountId:
 *           type: string
 *           format: cuid
 *           description: Source account ID
 *         toAccountId:
 *           type: string
 *           format: cuid
 *           description: Destination account ID
 *         description:
 *           type: string
 *           description: Optional transfer description
 *
 *     PaymentRequest:
 *       type: object
 *       required:
 *         - amount
 *         - accountId
 *         - recipientDetails
 *       properties:
 *         amount:
 *           type: number
 *           format: decimal
 *           minimum: 0.01
 *           description: Payment amount
 *         currency:
 *           type: string
 *           default: USD
 *           description: Payment currency
 *         accountId:
 *           type: string
 *           format: cuid
 *           description: Source account ID
 *         recipientDetails:
 *           type: object
 *           required:
 *             - name
 *             - email
 *           properties:
 *             name:
 *               type: string
 *               description: Recipient name
 *             email:
 *               type: string
 *               format: email
 *               description: Recipient email
 *             phone:
 *               type: string
 *               description: Recipient phone number
 *         description:
 *           type: string
 *           description: Optional payment description
 *
 *     TransactionAnalytics:
 *       type: object
 *       properties:
 *         totalTransactions:
 *           type: integer
 *           description: Total number of transactions
 *         totalVolume:
 *           type: number
 *           format: decimal
 *           description: Total transaction volume
 *         averageTransactionSize:
 *           type: number
 *           format: decimal
 *           description: Average transaction size
 *         transactionsByType:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           description: Count of transactions by type
 *         transactionsByStatus:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           description: Count of transactions by status
 *         dailyVolume:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               volume:
 *                 type: number
 *                 format: decimal
 *               count:
 *                 type: integer
 */

const router = Router();
const transactionController = new TransactionController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/transactions:
 *   post:
 *     summary: Create a new transaction (deposit/withdrawal)
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *           examples:
 *             deposit:
 *               summary: Deposit transaction
 *               value:
 *                 amount: 100.00
 *                 type: "DEPOSIT"
 *                 description: "Salary deposit"
 *                 toAccountId: "account-cuid-here"
 *                 currency: "USD"
 *             withdrawal:
 *               summary: Withdrawal transaction
 *               value:
 *                 amount: 50.00
 *                 type: "WITHDRAWAL"
 *                 description: "ATM withdrawal"
 *                 fromAccountId: "account-cuid-here"
 *                 currency: "USD"
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Validation error or insufficient funds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  authenticate,
  createTransactionRateLimit(),
  transactionValidation,
  validate,
  auditLog("CREATE", "TRANSACTION"),
  transactionController.createTransaction,
  transactionCacheInvalidation
);

/**
 * @swagger
 * /api/v1/transactions/transfer:
 *   post:
 *     summary: Transfer money between accounts
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *           example:
 *             amount: 150.00
 *             fromAccountId: "source-account-cuid"
 *             toAccountId: "destination-account-cuid"
 *             description: "Transfer to savings"
 *             currency: "USD"
 *     responses:
 *       201:
 *         description: Transfer completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Transfer failed (insufficient funds, invalid accounts, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/transfer",
  transferValidation,
  validate,
  auditLog("TRANSFER", "TRANSACTION"),
  transactionController.transferBetweenAccounts
);

/**
 * @swagger
 * /api/v1/transactions/payment:
 *   post:
 *     summary: Process payment to external recipient
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *           example:
 *             amount: 75.00
 *             accountId: "source-account-cuid"
 *             recipientDetails:
 *               name: "John Doe"
 *               email: "john.doe@example.com"
 *               phone: "+1234567890"
 *             description: "Payment for services"
 *             currency: "USD"
 *     responses:
 *       201:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Payment failed (insufficient funds, invalid account, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/payment",
  paymentValidation,
  validate,
  auditLog("PAYMENT", "TRANSACTION"),
  transactionController.processPayment
);

/**
 * @swagger
 * /api/v1/transactions:
 *   get:
 *     summary: Get user transactions with filtering and pagination
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Filter by account ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT]
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELLED]
 *         description: Filter by transaction status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions until this date
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *           format: decimal
 *         description: Filter by minimum amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *           format: decimal
 *         description: Filter by maximum amount
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [amount, createdAt, type, status]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  authenticate,
  paginationValidation,
  validate,
  transactionCacheMiddleware,
  transactionController.getTransactions
);

/**
 * @swagger
 * /api/v1/transactions/{id}:
 *   get:
 *     summary: Get transaction by ID
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:id",
  idValidation,
  validate,
  transactionController.getTransactionById
);

/**
 * @swagger
 * /api/v1/transactions/analytics:
 *   get:
 *     summary: Get transaction analytics
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: Analytics period
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics
 *     responses:
 *       200:
 *         description: Transaction analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TransactionAnalytics'
 *       400:
 *         description: Invalid period or date parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/analytics", transactionController.getTransactionAnalytics);

// Admin routes
router.use(authorize("ADMIN"));

/**
 * @swagger
 * /api/v1/transactions/admin/all:
 *   get:
 *     summary: Get all transactions (Admin only)
 *     tags: [Admin - Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Filter by account ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DEPOSIT, WITHDRAWAL, TRANSFER, PAYMENT]
 *         description: Filter by transaction type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELLED]
 *         description: Filter by transaction status
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions from this date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter transactions until this date
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *           format: decimal
 *         description: Filter by minimum amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *           format: decimal
 *         description: Filter by maximum amount
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [amount, createdAt, type, status]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: All transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       501:
 *         description: Not implemented yet
 */
router.get(
  "/admin/all",
  paginationValidation,
  validate,
  transactionController.getAllTransactions
);

/**
 * @swagger
 * /api/v1/transactions/admin/{id}:
 *   get:
 *     summary: Get transaction by ID (Admin only)
 *     tags: [Admin - Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get(
  "/admin/:id",
  idValidation,
  validate,
  transactionController.getTransactionByIdAdmin
);

export default router;
