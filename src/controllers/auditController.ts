import { Request, Response } from "express";
import { auditService } from "../services/auditService";
import { AuthenticatedRequest } from "../types";
import { query, validationResult } from "express-validator";
import logger from "../utils/logger";

export class AuditController {
  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Check if user has permission to access audit logs
      if (req.user!.role !== "ADMIN" && req.user!.role !== "SUPPORT") {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to access audit logs",
        });
        return;
      }

      const filters = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        severity: req.query.severity as string,
        category: req.query.category as string,
        complianceRelevant:
          req.query.complianceRelevant === "true" ? true : undefined,
      };

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await auditService.getAuditLogs(filters, page, limit);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error("Error retrieving audit logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve audit logs",
      });
    }
  }
  async exportAuditLogs(
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

      // Check if user has permission to export audit logs
      if (req.user!.role !== "ADMIN") {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to export audit logs",
        });
        return;
      }

      const filters = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
        severity: req.query.severity as string,
        category: req.query.category as string,
        complianceRelevant:
          req.query.complianceRelevant === "true" ? true : undefined,
      };

      const format = (req.query.format as string) || "csv";

      const exportData = await auditService.exportAuditLogs(filters, format);

      // Set appropriate headers for file download
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `audit_logs_${timestamp}.${format}`;

      res.setHeader(
        "Content-Type",
        format === "csv"
          ? "text/csv"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      res.send(exportData);
    } catch (error) {
      logger.error("Error exporting audit logs:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export audit logs",
      });
    }
  }
  async getAuditStatistics(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      // Check if user has permission to view audit statistics
      if (req.user!.role !== "ADMIN" && req.user!.role !== "SUPPORT") {
        res.status(403).json({
          success: false,
          message: "Insufficient permissions to access audit statistics",
        });
        return;
      }

      const days = parseInt(req.query.days as string) || 30;
      const statistics = await auditService.getAuditStatistics(days);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      logger.error("Error retrieving audit statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve audit statistics",
      });
    }
  }
}

// Validation middleware
export const validateAuditLogQuery = [
  query("userId").optional().isString().withMessage("User ID must be a string"),
  query("action").optional().isString().withMessage("Action must be a string"),
  query("resource")
    .optional()
    .isString()
    .withMessage("Resource must be a string"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO 8601 date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO 8601 date"),
  query("severity")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .withMessage("Severity must be LOW, MEDIUM, HIGH, or CRITICAL"),
  query("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  query("complianceRelevant")
    .optional()
    .isBoolean()
    .withMessage("Compliance relevant must be a boolean"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const validateAuditLogExport = [
  ...validateAuditLogQuery,
  query("format")
    .optional()
    .isIn(["csv", "xlsx"])
    .withMessage("Format must be csv or xlsx"),
];

export const validateAuditStatistics = [
  query("days")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Days must be between 1 and 365"),
];

export const auditController = new AuditController();
