import { Request, Response } from "express";
import { ActivityLog } from "../models/ActivityLog";
import { AuthenticationError, ValidationError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { Op } from "sequelize";

/**
 * @description Get activity logs for the authenticated user
 * @route GET /api/activity-logs
 */
export const getActivityLogs = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AuthenticationError("Authentication required to view activity logs.");
  }

  // Validate and clamp page/limit to safe ranges
  let page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || 20;
  
  // Clamp page to valid range (minimum 1)
  page = Math.max(1, Math.floor(page));
  
  // Clamp limit to valid range (1-100)
  limit = Math.max(1, Math.min(100, Math.floor(limit)));
  
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const actionFilter = req.query.action as string | undefined;

  const where: any = { userId };

  if (search) {
    where[Op.or] = [
      { action: { [Op.iLike]: `%${search}%` } },
      { resourceType: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (actionFilter) {
    where.action = actionFilter;
  }

  const { count, rows } = await ActivityLog.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    include: [
      {
        association: "user",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  res.json({
    success: true,
    data: rows,
    meta: {
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page * limit < count,
        hasPrev: page > 1,
      },
    },
  });
};

/**
 * @description Get a specific activity log by ID
 * @route GET /api/activity-logs/:id
 */
export const getActivityLogById = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { id } = req.params;

  if (!userId) {
    throw new AuthenticationError("Authentication required.");
  }

  const activityLog = await ActivityLog.findOne({
    where: { id, userId },
    include: [
      {
        association: "user",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  if (!activityLog) {
    throw new ValidationError("Activity log not found.");
  }

  res.json({
    success: true,
    data: activityLog,
  });
};
