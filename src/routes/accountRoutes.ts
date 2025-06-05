import { Router } from "express";
import { AccountController } from "../controllers/accountController";
import { authenticate, authorize, auditLog } from "../middleware/auth";
import { validate } from "../middleware";
import {
  createAccountValidation,
  paginationValidation,
  idValidation,
} from "../validators";

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *           description: Unique account identifier
 *         userId:
 *           type: string
 *           format: cuid
 *           description: Owner user ID
 *         accountNumber:
 *           type: string
 *           description: Unique account number
 *         accountType:
 *           type: string
 *           enum: [CHECKING, SAVINGS, BUSINESS]
 *           description: Type of account
 *         balance:
 *           type: number
 *           format: decimal
 *           description: Current account balance
 *         currency:
 *           type: string
 *           default: USD
 *           description: Account currency
 *         isActive:
 *           type: boolean
 *           description: Whether the account is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     CreateAccountRequest:
 *       type: object
 *       required:
 *         - accountType
 *       properties:
 *         accountType:
 *           type: string
 *           enum: [CHECKING, SAVINGS, BUSINESS]
 *           description: Type of account to create
 *         currency:
 *           type: string
 *           default: USD
 *           description: Account currency
 *
 *     AccountBalance:
 *       type: object
 *       properties:
 *         accountId:
 *           type: string
 *           format: cuid
 *         accountNumber:
 *           type: string
 *         accountType:
 *           type: string
 *           enum: [CHECKING, SAVINGS, BUSINESS]
 *         balance:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *
 *     AccountSummary:
 *       type: object
 *       properties:
 *         totalBalance:
 *           type: number
 *           format: decimal
 *           description: Total balance across all accounts
 *         totalAccounts:
 *           type: integer
 *           description: Number of accounts
 *         accountsByType:
 *           type: object
 *           additionalProperties:
 *             type: integer
 *           description: Count of accounts by type
 *         recentTransactions:
 *           type: integer
 *           description: Number of recent transactions (last 30 days)
 *
 *     PublicAccountInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: cuid
 *         accountNumber:
 *           type: string
 *         accountType:
 *           type: string
 *           enum: [CHECKING, SAVINGS, BUSINESS]
 *         currency:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 */

const router = Router();
const accountController = new AccountController();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAccountRequest'
 *           example:
 *             accountType: "CHECKING"
 *             currency: "USD"
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Account'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
// Customer routes
router.post(
  "/",
  createAccountValidation,
  validate,
  auditLog("CREATE", "ACCOUNT"),
  accountController.createAccount
);

/**
 * @swagger
 * /api/v1/accounts/my-accounts:
 *   get:
 *     summary: Get user's accounts
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
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
 *                         $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized
 */
router.get("/", accountController.getUserAccounts);

/**
 * @swagger
 * /api/v1/accounts/summary:
 *   get:
 *     summary: Get account summary
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AccountSummary'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/summary", accountController.getAccountSummary);

/**
 * @swagger
 * /api/v1/accounts/{id}:
 *   get:
 *     summary: Get account by ID
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", idValidation, validate, accountController.getAccountById);

/**
 * @swagger
 * /api/v1/accounts/{id}/balance:
 *   get:
 *     summary: Get account balance
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AccountBalance'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:id/balance",
  idValidation,
  validate,
  accountController.getAccountBalance
);

/**
 * @swagger
 * /api/v1/accounts/{id}/transactions:
 *   get:
 *     summary: Get account transactions
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Account ID
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
 *     responses:
 *       200:
 *         description: Account transactions retrieved successfully
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
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:id/transactions",
  idValidation,
  validate,
  paginationValidation,
  accountController.getAccountTransactions
);

/**
 * @swagger
 * /api/v1/accounts/{id}:
 *   delete:
 *     summary: Deactivate account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Failed to deactivate account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/:id",
  idValidation,
  validate,
  auditLog("DEACTIVATE", "ACCOUNT"),
  accountController.deactivateAccount
);

/**
 * @swagger
 * /api/v1/accounts/lookup/{accountNumber}:
 *   get:
 *     summary: Get public account information by account number
 *     tags: [Accounts]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Account number
 *     responses:
 *       200:
 *         description: Account found
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/PublicAccountInfo'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Public account lookup (limited info) for testing
router.get("/lookup/:accountNumber", accountController.getAccountByNumber);

// Admin routes
router.use(authorize("ADMIN"));

/**
 * @swagger
 * /api/v1/accounts/admin/all:
 *   get:
 *     summary: Get all accounts (Admin only)
 *     tags: [Admin - Accounts]
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
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
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
 *                         $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get(
  "/admin/all",
  paginationValidation,
  validate,
  accountController.getAllAccounts
);

/**
 * @swagger
 * /api/v1/accounts/admin/{id}:
 *   get:
 *     summary: Get account by ID (Admin only)
 *     tags: [Admin - Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
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
  accountController.getAccountByIdAdmin
);

/**
 * @swagger
 * /api/v1/accounts/admin/{id}:
 *   delete:
 *     summary: Deactivate account (Admin only)
 *     tags: [Admin - Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: cuid
 *         description: Account ID
 *     responses:
 *       200:
 *         description: Account deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Failed to deactivate account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.delete(
  "/admin/:id",
  idValidation,
  validate,
  auditLog("ADMIN_DEACTIVATE", "ACCOUNT"),
  accountController.deactivateAccountAdmin
);

export default router;
