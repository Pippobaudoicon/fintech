import prisma from "../config/database";
import logger from "../utils/logger";

interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: string;
  category?: string;
  complianceRelevant?: boolean;
}

interface AuditLogResult {
  logs: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

class AuditService {
  async getAuditLogs(
    filters: AuditLogFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<AuditLogResult> {
    try {
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};

      if (filters.userId) {
        whereClause.userId = filters.userId;
      }

      if (filters.action) {
        whereClause.action = {
          contains: filters.action,
          mode: "insensitive",
        };
      }

      if (filters.resource) {
        whereClause.resource = {
          contains: filters.resource,
          mode: "insensitive",
        };
      }

      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) {
          whereClause.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          whereClause.createdAt.lte = filters.endDate;
        }
      }

      // For now, we'll add these fields to the existing audit_logs table later
      // These are placeholders for enhanced filtering
      if (filters.severity) {
        // Add severity filter when we enhance the schema
        logger.info(
          `Severity filter requested: ${filters.severity} (not yet implemented)`
        );
      }

      if (filters.category) {
        // Add category filter when we enhance the schema
        logger.info(
          `Category filter requested: ${filters.category} (not yet implemented)`
        );
      }

      if (filters.complianceRelevant !== undefined) {
        // Add compliance filter when we enhance the schema
        logger.info(
          `Compliance filter requested: ${filters.complianceRelevant} (not yet implemented)`
        );
      }

      const [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({
          where: whereClause,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        logs: logs.map((log) => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
          user: log.user
            ? {
                id: log.user.id,
                email: log.user.email,
                name: `${log.user.firstName} ${log.user.lastName}`,
                role: log.user.role,
              }
            : null,
          // Placeholder fields for enhanced audit features
          severity: "MEDIUM", // Default until we add this field
          category: this.categorizeAuditLog(log.action, log.resource),
          complianceRelevant: this.isComplianceRelevant(
            log.action,
            log.resource
          ),
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords: totalCount,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      };
    } catch (error) {
      logger.error("Error retrieving audit logs:", error);
      throw error;
    }
  }

  async exportAuditLogs(
    filters: AuditLogFilters,
    format: string = "csv"
  ): Promise<string | Buffer> {
    try {
      // Get all matching logs (without pagination for export)
      const whereClause: any = {};

      if (filters.userId) whereClause.userId = filters.userId;
      if (filters.action)
        whereClause.action = { contains: filters.action, mode: "insensitive" };
      if (filters.resource)
        whereClause.resource = {
          contains: filters.resource,
          mode: "insensitive",
        };
      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
      }

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (format === "csv") {
        return this.generateCSV(logs);
      } else if (format === "xlsx") {
        // For now, return CSV format until we add xlsx library
        logger.info(
          "XLSX format requested but not yet implemented, returning CSV"
        );
        return this.generateCSV(logs);
      }

      throw new Error(`Unsupported export format: ${format}`);
    } catch (error) {
      logger.error("Error exporting audit logs:", error);
      throw error;
    }
  }

  async getAuditStatistics(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [
        totalLogs,
        userActions,
        actionBreakdown,
        resourceBreakdown,
        dailyActivity,
      ] = await Promise.all([
        // Total logs in period
        prisma.auditLog.count({
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }),

        // Unique users with activity
        prisma.auditLog.groupBy({
          by: ["userId"],
          where: {
            createdAt: {
              gte: startDate,
            },
            userId: {
              not: null,
            },
          },
          _count: {
            userId: true,
          },
        }),

        // Action breakdown
        prisma.auditLog.groupBy({
          by: ["action"],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: {
            action: true,
          },
          orderBy: {
            _count: {
              action: "desc",
            },
          },
        }),

        // Resource breakdown
        prisma.auditLog.groupBy({
          by: ["resource"],
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          _count: {
            resource: true,
          },
          orderBy: {
            _count: {
              resource: "desc",
            },
          },
        }),

        // Daily activity (simplified version)
        prisma.$queryRaw`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM audit_logs
          WHERE created_at >= ${startDate}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `,
      ]);

      return {
        summary: {
          totalLogs,
          uniqueUsers: userActions.length,
          dateRange: {
            from: startDate,
            to: new Date(),
            days,
          },
        },
        breakdowns: {
          actions: actionBreakdown.map((item) => ({
            action: item.action,
            count: item._count.action,
          })),
          resources: resourceBreakdown.map((item) => ({
            resource: item.resource,
            count: item._count.resource,
          })),
        },
        activity: {
          daily: Array.isArray(dailyActivity) ? dailyActivity : [],
        },
        compliance: {
          complianceRelevantLogs: this.estimateComplianceLogs(totalLogs),
          criticalEvents: 0, // Placeholder until we add severity
        },
      };
    } catch (error) {
      logger.error("Error retrieving audit statistics:", error);
      throw error;
    }
  }

  // Enhanced audit logging method for future use
  async logAuditEvent(
    userId: string | null,
    action: string,
    resource: string,
    details: any,
    options: {
      ipAddress?: string;
      userAgent?: string;
      severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      category?: string;
      complianceRelevant?: boolean;
    } = {}
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          details,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });

      // Log enhanced properties for future schema enhancement
      if (options.severity || options.category || options.complianceRelevant) {
        logger.info("Enhanced audit properties recorded:", {
          action,
          resource,
          severity: options.severity,
          category: options.category,
          complianceRelevant: options.complianceRelevant,
        });
      }
    } catch (error) {
      logger.error("Error logging audit event:", error);
      throw error;
    }
  }

  private generateCSV(logs: any[]): string {
    const headers = [
      "ID",
      "Date/Time",
      "User Email",
      "User Name",
      "User Role",
      "Action",
      "Resource",
      "Details",
      "IP Address",
      "User Agent",
      "Severity",
      "Category",
      "Compliance Relevant",
    ];

    const csvRows = [headers.join(",")];

    logs.forEach((log) => {
      const row = [
        log.id,
        log.createdAt.toISOString(),
        log.user?.email || "N/A",
        log.user ? `${log.user.firstName} ${log.user.lastName}` : "N/A",
        log.user?.role || "N/A",
        log.action,
        log.resource,
        JSON.stringify(log.details || {}),
        log.ipAddress || "N/A",
        log.userAgent || "N/A",
        "MEDIUM", // Placeholder
        this.categorizeAuditLog(log.action, log.resource),
        this.isComplianceRelevant(log.action, log.resource),
      ];

      // Escape commas and quotes in CSV
      const escapedRow = row.map((field) => {
        const stringField = String(field);
        if (
          stringField.includes(",") ||
          stringField.includes('"') ||
          stringField.includes("\n")
        ) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      });

      csvRows.push(escapedRow.join(","));
    });

    return csvRows.join("\n");
  }

  private categorizeAuditLog(action: string, resource: string): string {
    if (
      action.toLowerCase().includes("login") ||
      action.toLowerCase().includes("auth")
    ) {
      return "AUTHENTICATION";
    }
    if (resource.toLowerCase().includes("transaction")) {
      return "FINANCIAL";
    }
    if (
      resource.toLowerCase().includes("user") ||
      resource.toLowerCase().includes("account")
    ) {
      return "USER_MANAGEMENT";
    }
    if (
      action.toLowerCase().includes("create") ||
      action.toLowerCase().includes("update") ||
      action.toLowerCase().includes("delete")
    ) {
      return "DATA_MODIFICATION";
    }
    return "GENERAL";
  }

  private isComplianceRelevant(action: string, resource: string): boolean {
    const complianceActions = [
      "login",
      "logout",
      "create",
      "update",
      "delete",
      "transfer",
      "payment",
    ];
    const complianceResources = ["user", "account", "transaction", "audit"];

    return (
      complianceActions.some((ca) => action.toLowerCase().includes(ca)) ||
      complianceResources.some((cr) => resource.toLowerCase().includes(cr))
    );
  }

  private estimateComplianceLogs(totalLogs: number): number {
    // Rough estimate - in a real system, this would be based on actual compliance tagging
    return Math.floor(totalLogs * 0.7); // Assume 70% of logs are compliance-relevant
  }
}

export const auditService = new AuditService();
