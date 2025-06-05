import { Router } from "express";
import userRoutes from "./userRoutes";
import accountRoutes from "./accountRoutes";
import transactionRoutes from "./transactionRoutes";
import auditRoutes from "./auditRoutes";
import bulkTransactionRoutes from "./bulkTransactionRoutes";

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and session management
 *   - name: Users
 *     description: User profile and notification management
 *   - name: Accounts
 *     description: Bank account management operations
 *   - name: Transactions
 *     description: Financial transaction operations
 *   - name: Bulk Transactions
 *     description: Bulk transaction processing operations
 *   - name: Audit
 *     description: Audit log access and reporting
 *   - name: Admin - Users
 *     description: Administrative user management (Admin only)
 *   - name: Admin - Accounts
 *     description: Administrative account management (Admin only)
 *   - name: Admin - Transactions
 *     description: Administrative transaction management (Admin only)
 */

const router = Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 *                 service:
 *                   type: string
 *                   example: "Fintech API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Fintech API",
    version: "1.0.0",
  });
});

// API routes
router.use("/users", userRoutes);
router.use("/accounts", accountRoutes);
router.use("/transactions", transactionRoutes);
router.use("/audit", auditRoutes);
router.use("/bulk-transactions", bulkTransactionRoutes);

export default router;
