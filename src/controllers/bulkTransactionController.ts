import { Request, Response } from "express";
import { bulkTransactionService } from "../services/bulkTransactionService";
import { AuthenticatedRequest } from "../types";
import { body, param, query, validationResult } from "express-validator";
import logger from "../utils/logger";

export class BulkTransactionController {
  async createBulkTransaction(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }
      const result = await bulkTransactionService.createBulkTransaction(
        req.user!.id,
        req.body
      );

      res.status(202).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Error creating bulk transaction:", error);
      res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create bulk transaction",
      });
    }
  }
  async getBulkTransactionStatus(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { batchId } = req.params;
      const status = await bulkTransactionService.getBulkTransactionStatus(
        batchId
      );

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error("Error getting bulk transaction status:", error);
      res.status(404).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Bulk transaction batch not found",
      });
    }
  }
  async getUserBulkTransactions(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await bulkTransactionService.getUserBulkTransactions(
        req.user!.id,
        page,
        limit
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Error getting user bulk transactions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve bulk transactions",
      });
    }
  }
}

// Validation middleware
export const validateCreateBulkTransaction = [
  body("transactions")
    .isArray({ min: 1, max: 1000 })
    .withMessage("Transactions must be an array with 1-1000 items"),
  body("transactions.*.fromAccountId")
    .isString()
    .notEmpty()
    .withMessage("From account ID is required"),
  body("transactions.*.toAccountId")
    .isString()
    .notEmpty()
    .withMessage("To account ID is required"),
  body("transactions.*.amount")
    .isNumeric()
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be a positive number"),
  body("transactions.*.description")
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage("Description must be a string with max 255 characters"),
  body("transactions.*.reference")
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage("Reference must be a string with max 255 characters"),
  body("scheduledFor")
    .optional()
    .isISO8601()
    .withMessage("Scheduled for must be a valid date"),
];

export const validateBatchId = [
  param("batchId").isString().notEmpty().withMessage("Batch ID is required"),
];

export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const bulkTransactionController = new BulkTransactionController();
