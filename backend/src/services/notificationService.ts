import { Op } from "sequelize";
import { Notification } from "../models/Notification";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export const notificationService = {
  async create(input: CreateNotificationInput) {
    return Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata || null,
    });
  },

  async list(userId: string, options?: { unreadOnly?: boolean; limit?: number }) {
    const where: Record<string, unknown> = { userId };
    if (options?.unreadOnly) {
      where.readAt = { [Op.is]: null };
    }

    return Notification.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: Math.min(Math.max(options?.limit || 50, 1), 100),
    });
  },

  async unreadCount(userId: string) {
    return Notification.count({
      where: {
        userId,
        readAt: { [Op.is]: null },
      },
    });
  },

  async markRead(userId: string, notificationId: string) {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) return null;
    if (!notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }
    return notification;
  },

  async markAllRead(userId: string) {
    const [updated] = await Notification.update(
      { readAt: new Date() },
      {
        where: {
          userId,
          readAt: { [Op.is]: null },
        },
      },
    );
    return updated;
  },
};
