import { Request, Response } from "express";
import { AuthenticationError, NotFoundError } from "../middleware/errorHandler";
import { notificationService } from "../services/notificationService";

const requireUserId = (req: Request): string => {
  const userId = req.user?.userId;
  if (!userId) throw new AuthenticationError("Authentication required");
  return userId;
};

export const listNotifications = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const unreadOnly = req.query.unread === "true";
  const limit = Number(req.query.limit) || 50;
  const [rows, unreadCount] = await Promise.all([
    notificationService.list(userId, { unreadOnly, limit }),
    notificationService.unreadCount(userId),
  ]);

  const notifications = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    metadata: n.metadata ?? null,
    readAt: n.readAt,
    createdAt: n.createdAt,
  }));

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
    },
  });
};

export const markNotificationRead = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const notification = await notificationService.markRead(userId, req.params.id);
  if (!notification) {
    throw new NotFoundError("Notification not found");
  }
  res.json({ success: true, data: notification });
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
  const userId = requireUserId(req);
  const updated = await notificationService.markAllRead(userId);
  res.json({ success: true, data: { updated } });
};
