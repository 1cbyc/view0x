import { ActivityLog } from "../models/ActivityLog";
import { Request } from "express";

export const logActivity = async (
  userId: string,
  action: string,
  resourceType: string,
  options?: {
    resourceId?: string;
    details?: object;
    req?: Request;
  },
) => {
  try {
    const ipAddress = options?.req?.ip || options?.req?.socket.remoteAddress;
    const userAgent = options?.req?.get("user-agent");

    await ActivityLog.create({
      userId,
      action,
      resourceType,
      resourceId: options?.resourceId,
      details: options?.details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
