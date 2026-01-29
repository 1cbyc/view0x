import { Request, Response } from "express";
import ApiAnalytics from "../models/ApiAnalytics";
import { Op } from "sequelize";
import { logger } from "../utils/logger";
import { AuthenticationError, ValidationError } from "../middleware/errorHandler";
import { stringify } from "csv-stringify/sync";

/**
 * @description Get analytics dashboard data
 * @route GET /api/analytics/dashboard
 */
export const getAnalyticsDashboard = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new AuthenticationError("Authentication required");
    }

    try {
        const { startDate, endDate, endpoint, dateRange } = req.query;

        // Build date range filter
        const dateFilter: any = {};

        // Handle dateRange shortcuts (7d, 30d, 90d)
        if (dateRange) {
            const now = new Date();
            let daysAgo = 7; // default

            if (dateRange === '30d') daysAgo = 30;
            else if (dateRange === '90d') daysAgo = 90;
            else if (dateRange === '7d') daysAgo = 7;
            else {
                throw new ValidationError(`Invalid dateRange: ${dateRange}. Use 7d, 30d, or 90d`);
            }

            const startTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            dateFilter[Op.gte] = startTime;
            dateFilter[Op.lte] = now;
        }
        // Handle explicit start/end dates
        else {
            if (startDate) {
                const start = new Date(startDate as string);
                if (isNaN(start.getTime())) {
                    throw new ValidationError(`Invalid startDate format: ${startDate}`);
                }
                dateFilter[Op.gte] = start;
            }
            if (endDate) {
                const end = new Date(endDate as string);
                if (isNaN(end.getTime())) {
                    throw new ValidationError(`Invalid endDate format: ${endDate}`);
                }
                dateFilter[Op.lte] = end;
            }
        }

        const whereClause: any = {};
        if (Object.keys(dateFilter).length > 0) {
            whereClause.timestamp = dateFilter;
        }

        if (endpoint) {
            whereClause.endpoint = endpoint;
        }

        // Get total requests
        const totalRequests = await ApiAnalytics.count({ where: whereClause });

        // Get requests by status code
        const requestsByStatus = await ApiAnalytics.findAll({
            where: whereClause,
            attributes: [
                "statusCode",
                [ApiAnalytics.sequelize!.fn("COUNT", "*"), "count"],
            ],
            group: ["statusCode"],
            raw: true,
        });

        // Get average response time
        const avgResponseTime = await ApiAnalytics.findOne({
            where: whereClause,
            attributes: [
                [ApiAnalytics.sequelize!.fn("AVG", ApiAnalytics.sequelize!.col("responseTime")), "avg"],
            ],
            raw: true,
        });

        // Get requests by endpoint
        const requestsByEndpoint = await ApiAnalytics.findAll({
            where: whereClause,
            attributes: [
                "endpoint",
                [ApiAnalytics.sequelize!.fn("COUNT", "*"), "count"],
                [ApiAnalytics.sequelize!.fn("AVG", ApiAnalytics.sequelize!.col("responseTime")), "avgResponseTime"],
            ],
            group: ["endpoint"],
            order: [[ApiAnalytics.sequelize!.fn("COUNT", "*"), "DESC"]],
            limit: 10,
            raw: true,
        });

        // Get requests over time (daily)
        const requestsOverTime = await ApiAnalytics.findAll({
            where: whereClause,
            attributes: [
                [ApiAnalytics.sequelize!.fn("DATE", ApiAnalytics.sequelize!.col("timestamp")), "date"],
                [ApiAnalytics.sequelize!.fn("COUNT", "*"), "count"],
            ],
            group: [ApiAnalytics.sequelize!.fn("DATE", ApiAnalytics.sequelize!.col("timestamp"))],
            order: [[ApiAnalytics.sequelize!.fn("DATE", ApiAnalytics.sequelize!.col("timestamp")), "ASC"]],
            raw: true,
        });

        // Error rate
        const errorCount = await ApiAnalytics.count({
            where: {
                ...whereClause,
                statusCode: {
                    [Op.gte]: 400,
                },
            },
        });

        const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

        res.json({
            success: true,
            data: {
                summary: {
                    totalRequests,
                    errorCount,
                    errorRate: Math.round(errorRate * 100) / 100,
                    avgResponseTime: Math.round((avgResponseTime as any)?.avg || 0),
                },
                requestsByStatus,
                requestsByEndpoint,
                requestsOverTime,
            },
        });
    } catch (error: any) {
        logger.error("Analytics dashboard error:", error);
        throw error;
    }
};

/**
 * @description Get endpoint-specific analytics
 * @route GET /api/analytics/endpoint
 */
export const getEndpointAnalytics = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new AuthenticationError("Authentication required");
    }

    const { endpoint } = req.query;

    if (!endpoint || typeof endpoint !== 'string') {
        throw new ValidationError("Endpoint parameter is required and must be a string");
    }

    // Type-safe endpoint string
    const endpointStr = endpoint as string;

    try {
        // Get endpoint metrics
        const metrics = await ApiAnalytics.findAll({
            where: { endpoint: endpointStr },
            attributes: [
                [ApiAnalytics.sequelize!.fn("COUNT", "*"), "totalRequests"],
                [ApiAnalytics.sequelize!.fn("AVG", ApiAnalytics.sequelize!.col("responseTime")), "avgResponseTime"],
                [ApiAnalytics.sequelize!.fn("MIN", ApiAnalytics.sequelize!.col("responseTime")), "minResponseTime"],
                [ApiAnalytics.sequelize!.fn("MAX", ApiAnalytics.sequelize!.col("responseTime")), "maxResponseTime"],
            ],
            raw: true,
        });

        // Get requests by method
        const requestsByMethod = await ApiAnalytics.findAll({
            where: { endpoint: endpointStr },
            attributes: [
                "method",
                [ApiAnalytics.sequelize!.fn("COUNT", "*"), "count"],
            ],
            group: ["method"],
            raw: true,
        });

        // Get recent errors
        const recentErrors = await ApiAnalytics.findAll({
            where: {
                endpoint: endpointStr,
                statusCode: {
                    [Op.gte]: 400,
                },
            },
            order: [["timestamp", "DESC"]],
            limit: 10,
        });

        res.json({
            success: true,
            data: {
                endpoint: endpointStr,
                metrics: metrics[0],
                requestsByMethod,
                recentErrors,
            },
        });
    } catch (error: any) {
        logger.error("Endpoint analytics error:", error);
        throw error;
    }
};

/**
 * @description Export analytics as CSV or JSON
 * @route GET /api/analytics/export
 */
export const exportAnalytics = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new AuthenticationError("Authentication required");
    }

    const { format = "json", startDate, endDate } = req.query;

    if (!["json", "csv"].includes(format as string)) {
        throw new ValidationError("Invalid format. Supported: json, csv");
    }

    try {
        // Build query
        const whereClause: any = {};
        if (startDate) {
            whereClause.timestamp = { [Op.gte]: new Date(startDate as string) };
        }
        if (endDate) {
            if (!whereClause.timestamp) {
                whereClause.timestamp = {};
            }
            whereClause.timestamp[Op.lte] = new Date(endDate as string);
        }

        const analytics = await ApiAnalytics.findAll({
            where: whereClause,
            order: [["timestamp", "DESC"]],
            limit: 10000, // Limit to prevent overwhelming exports
        });

        // Mask PII data before exporting
        const sanitizedData = analytics.map(record => ({
            timestamp: record.timestamp.toISOString(),
            endpoint: record.endpoint,
            method: record.method,
            statusCode: record.statusCode,
            responseTime: record.responseTime,
            userId: record.userId ? `***${record.userId.toString().slice(-4)}` : "",
            ipAddress: record.ipAddress ? record.ipAddress.replace(/\d+\.\d+\.\d+\./, "***.***.***.") : "",
        }));

        if (format === "json") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="analytics-${Date.now()}.json"`,
            );
            res.send(JSON.stringify(sanitizedData, null, 2));
        } else {
            // CSV format using csv-stringify to prevent CSV injection
            const csvData = stringify(sanitizedData, {
                header: true,
                columns: [
                    { key: 'timestamp', header: 'Timestamp' },
                    { key: 'endpoint', header: 'Endpoint' },
                    { key: 'method', header: 'Method' },
                    { key: 'statusCode', header: 'Status Code' },
                    { key: 'responseTime', header: 'Response Time (ms)' },
                    { key: 'userId', header: 'User ID (Masked)' },
                    { key: 'ipAddress', header: 'IP Address (Masked)' },
                ],
            });

            res.setHeader("Content-Type", "text/csv");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="analytics-${Date.now()}.csv"`,
            );
            res.send(csvData);
        }

        logger.info(`Analytics exported: ${format} format by user ${userId}`);
    } catch (error: any) {
        logger.error("Analytics export error:", error);
        throw error;
    }
};
