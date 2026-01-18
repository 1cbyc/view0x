import { Request, Response } from "express";
import { User } from "../models/User";
import { Analysis } from "../models/Analysis";
import crypto from "crypto";
import { logger } from "../utils/logger";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "../middleware/errorHandler";

interface Webhook {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

const webhooks: Map<string, Webhook[]> = new Map();

export const createWebhook = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { url, events } = req.body;

  if (!userId) {
    throw new AuthorizationError("Authentication required");
  }

  if (!url) {
    throw new ValidationError("Webhook URL is required");
  }

  if (!events || !Array.isArray(events) || events.length === 0) {
    throw new ValidationError("Events array is required");
  }

  const secret = crypto.randomBytes(32).toString("hex");
  const webhook: Webhook = {
    id: crypto.randomUUID(),
    userId,
    url,
    secret,
    events,
    active: true,
  };

  const userWebhooks = webhooks.get(userId) || [];
  userWebhooks.push(webhook);
  webhooks.set(userId, userWebhooks);

  logger.info(`Webhook created: ${webhook.id} for user ${userId}`);

  res.status(201).json({
    success: true,
    data: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      active: webhook.active,
    },
  });
};

export const getWebhooks = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AuthorizationError("Authentication required");
  }

  const userWebhooks = webhooks.get(userId) || [];

  res.json({
    success: true,
    data: userWebhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      active: w.active,
    })),
  });
};

export const deleteWebhook = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  if (!userId) {
    throw new AuthorizationError("Authentication required");
  }

  const userWebhooks = webhooks.get(userId) || [];
  const index = userWebhooks.findIndex((w) => w.id === id);

  if (index === -1) {
    throw new NotFoundError("Webhook not found");
  }

  userWebhooks.splice(index, 1);
  webhooks.set(userId, userWebhooks);

  res.status(204).send();
};

export const triggerWebhook = async (
  userId: string,
  event: string,
  payload: any,
) => {
  const userWebhooks = webhooks.get(userId) || [];
  const activeWebhooks = userWebhooks.filter(
    (w) => w.active && w.events.includes(event),
  );

  for (const webhook of activeWebhooks) {
    try {
      const signature = crypto
        .createHmac("sha256", webhook.secret)
        .update(JSON.stringify(payload))
        .digest("hex");

      await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
          "X-Webhook-Signature": signature,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      logger.error(`Webhook delivery failed: ${webhook.id}`, error);
    }
  }
};
