import { Router } from 'express';
import {
  bulkTransactionController,
  validateCreateBulkTransaction,
  validateBatchId,
  validatePagination,
} from '../controllers/bulkTransactionController';
import { authenticate } from '../middleware/auth';
import { createFinancialRateLimit } from '../middleware';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BulkTransaction:
 *       type: object
 *       required:
 *         - transactions
 *       properties:
 *         transactions:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - fromAccountId
 *               - toAccountId
 *               - amount
 *             properties:
 *               fromAccountId:
 *                 type: string
 *                 description: Source account ID
 *               toAccountId:
 *                 type: string
 *                 description: Destination account ID
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Transaction amount
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 description: Transaction description
 *               reference:
 *                 type: string
 *                 maxLength: 255
 *                 description: Transaction reference
 *           minItems: 1
 *           maxItems: 1000
 *         scheduledFor:
 *           type: string
 *           format: date-time
 *           description: Scheduled execution time (optional)
 *       example:
 *         transactions:
 *           - fromAccountId: "clrx5678901234567890"
 *             toAccountId: "clrx6789012345678901"
 *             amount: 100.50
 *             description: "Bulk payment 1"
 *           - fromAccountId: "clrx5678901234567890"
 *             toAccountId: "clrx7890123456789012"
 *             amount: 250.75
 *             description: "Bulk payment 2"
 *         scheduledFor: "2024-12-31T10:00:00Z"
 *
 *     BulkTransactionStatus:
 *       type: object
 *       properties:
 *         batchId:
 *           type: string
 *         status:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, PARTIALLY_COMPLETED]
 *         totalTransactions:
 *           type: integer
 *         successfulTransactions:
 *           type: integer
 *         failedTransactions:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         results:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               index:
 *                 type: integer
 *               transactionId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *               error:
 *                 type: string
 */

/**
 * @swagger
 * /api/bulk-transactions:
 *   post:
 *     summary: Create bulk transaction batch
 *     tags: [Bulk Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkTransaction'
 *     responses:
 *       202:
 *         description: Bulk transaction batch accepted for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     batchId:
 *                       type: string
 *                     message:
 *                       type: string
 *                     estimatedCompletionTime:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid bulk transaction request
 *       429:
 *         description: Too many bulk operations in progress
 */
router.post(
  '/',
  authenticate,
  createFinancialRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 2, // 2 bulk operations per 5 minutes
    message: 'Too many bulk transaction attempts, please try again later',
  }),
  validateCreateBulkTransaction,
  bulkTransactionController.createBulkTransaction,
);

/**
 * @swagger
 * /api/bulk-transactions/{batchId}/status:
 *   get:
 *     summary: Get bulk transaction batch status
 *     tags: [Bulk Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bulk transaction batch ID
 *     responses:
 *       200:
 *         description: Bulk transaction status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/BulkTransactionStatus'
 *       404:
 *         description: Bulk transaction batch not found
 */
router.get(
  '/:batchId/status',
  authenticate,
  validateBatchId,
  bulkTransactionController.getBulkTransactionStatus,
);

/**
 * @swagger
 * /api/bulk-transactions/history:
 *   get:
 *     summary: Get user's bulk transaction history
 *     tags: [Bulk Transactions]
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
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Bulk transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     batches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           batchId:
 *                             type: string
 *                           status:
 *                             type: string
 *                           totalTransactions:
 *                             type: integer
 *                           successfulTransactions:
 *                             type: integer
 *                           failedTransactions:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           completedAt:
 *                             type: string
 *                             format: date-time
 *                           scheduledFor:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalRecords:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrevious:
 *                           type: boolean
 *       500:
 *         description: Failed to retrieve bulk transactions
 */
router.get(
  '/history',
  authenticate,
  validatePagination,
  bulkTransactionController.getUserBulkTransactions,
);

export default router;
