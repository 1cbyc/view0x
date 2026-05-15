import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/environment";
import { logger } from "../utils/logger";

let transporter: Transporter | null = null;

const isEmailConfigured = (): boolean =>
  Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.FROM_EMAIL);

const getTransporter = (): Transporter => {
  if (!isEmailConfigured()) {
    throw new Error("SMTP is not configured");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const publicAppUrl = (): string =>
  (process.env.APP_PUBLIC_URL || "https://view0x.com").replace(/\/$/, "");

export const sendPasswordResetEmail = async (
  to: string,
  resetToken: string,
): Promise<boolean> => {
  const link = `${publicAppUrl()}/reset-password?token=${encodeURIComponent(resetToken)}`;
  return sendMail({
    to,
    subject: "Reset your view0x password",
    text: `Reset your password: ${link}\n\nThis link expires in 24 hours.`,
    html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
  });
};

export const sendVerificationEmail = async (
  to: string,
  verificationToken: string,
): Promise<boolean> => {
  const link = `${publicAppUrl()}/verify-email?token=${encodeURIComponent(verificationToken)}`;
  return sendMail({
    to,
    subject: "Verify your view0x email",
    text: `Verify your email: ${link}`,
    html: `<p>Welcome to view0x. Verify your email:</p><p><a href="${link}">${link}</a></p>`,
  });
};

async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.warn(
      `Email not sent (SMTP not configured): "${options.subject}" → ${options.to}`,
    );
    return false;
  }

  try {
    await getTransporter().sendMail({
      from: env.FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info(`Email sent: "${options.subject}" → ${options.to}`);
    return true;
  } catch (error) {
    logger.error(`Email failed: "${options.subject}" → ${options.to}`, error);
    return false;
  }
}

export const emailService = {
  isConfigured: isEmailConfigured,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
