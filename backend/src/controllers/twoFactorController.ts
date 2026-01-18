import { Request, Response } from "express";
import { User } from "../models/User";
import { authenticator } from "otplib/otplib";
import QRCode from "qrcode";
import {
  AuthenticationError,
  ValidationError,
} from "../middleware/errorHandler";
import { logger } from "../utils/logger";

export const setup2FA = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    throw new AuthenticationError("Authentication required");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthenticationError("User not found");
  }

  const secret = authenticator.generateSecret();
  const serviceName = "view0x";
  const accountName = user.email;

  const otpauth = authenticator.keyuri(accountName, serviceName, secret);

  const qrCodeUrl = await QRCode.toDataURL(otpauth);

  user.twoFactorSecret = secret;
  user.twoFactorEnabled = false;
  await user.save();

  res.json({
    success: true,
    data: {
      secret,
      qrCode: qrCodeUrl,
      manualEntryKey: secret,
    },
  });
};

export const verify2FA = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { token } = req.body;

  if (!userId) {
    throw new AuthenticationError("Authentication required");
  }

  if (!token) {
    throw new ValidationError("Token is required");
  }

  const user = await User.findByPk(userId);
  if (!user || !user.twoFactorSecret) {
    throw new AuthenticationError("2FA not set up");
  }

  const isValid = authenticator.verify({
    token,
    secret: user.twoFactorSecret,
  });

  if (!isValid) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid 2FA token",
      },
    });
  }

  user.twoFactorEnabled = true;
  await user.save();

  logger.info(`2FA enabled for user: ${user.email}`);

  res.json({
    success: true,
    message: "2FA enabled successfully",
  });
};

export const disable2FA = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { password } = req.body;

  if (!userId) {
    throw new AuthenticationError("Authentication required");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthenticationError("User not found");
  }

  if (password) {
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid password",
        },
      });
    }
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = null as any;
  await user.save();

  logger.info(`2FA disabled for user: ${user.email}`);

  res.json({
    success: true,
    message: "2FA disabled successfully",
  });
};
