import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { env } from "../config/environment";
import { logger } from "../utils/logger";

// Helper function to generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

// Helper function to generate refresh token
const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId, type: "refresh" }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

// Login controller
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Email and password are required",
        },
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      });
    }

    // Check password
    const isValidPassword = await user.checkPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      });
    }

    // Update last login
    user.lastLogin = new Date();

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token
    user.setRefreshToken(refreshToken, env.REFRESH_TOKEN_EXPIRES_IN);
    await user.save();

    logger.info(`User logged in: ${user.email}`);

    // Return user data and tokens
    res.json({
      success: true,
      data: {
        user: user.toProfileObject(),
        tokens: {
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
          tokenType: "Bearer",
        },
      },
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Register controller
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, company } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Name, email, and password are required",
        },
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Password must be at least 8 characters long",
        },
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: "ALREADY_EXISTS",
          message: "User already exists with this email",
        },
      });
    }

    // Create new user
    const user = await User.createUser({
      name,
      email,
      password,
      company,
      plan: "free",
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token
    user.setRefreshToken(refreshToken, env.REFRESH_TOKEN_EXPIRES_IN);
    await user.save();

    logger.info(`New user registered: ${user.email}`);

    // Return user data and tokens
    res.status(201).json({
      success: true,
      data: {
        user: user.toProfileObject(),
        tokens: {
          accessToken: token,
          refreshToken: refreshToken,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
          tokenType: "Bearer",
        },
        message: "User registered successfully",
        requiresEmailVerification: true,
      },
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Refresh token controller
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Refresh token is required",
        },
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as {
        userId: string;
        type: string;
      };
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired refresh token",
        },
      });
    }

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid token type",
        },
      });
    }

    // Find user and validate refresh token
    const user = await User.findByPk(decoded.userId);
    if (
      !user ||
      !user.isRefreshTokenValid() ||
      user.refreshToken !== refreshToken
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired refresh token",
        },
      });
    }

    // Generate new tokens
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update refresh token
    user.setRefreshToken(newRefreshToken, env.REFRESH_TOKEN_EXPIRES_IN);
    await user.save();

    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: newToken,
          refreshToken: newRefreshToken,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
          tokenType: "Bearer",
        },
      },
    });
  } catch (error) {
    logger.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Request password reset
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Email is required",
        },
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal that the user doesn't exist for security
      return res.json({
        success: true,
        message:
          "If your email is registered, you will receive a password reset link",
      });
    }

    // Generate reset token
    const resetToken = user.generateResetToken();
    await user.save();

    // TODO: Send email with reset link
    logger.info(`Password reset requested for: ${email}`);

    res.json({
      success: true,
      message:
        "If your email is registered, you will receive a password reset link",
    });
  } catch (error) {
    logger.error("Password reset request error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Token and password are required",
        },
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Password must be at least 8 characters long",
        },
      });
    }

    // Find user by reset token
    const user = await User.findByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired reset token",
        },
      });
    }

    // Update password and clear reset token
    await user.setPassword(password);
    user.resetPasswordToken = null as any;
    user.resetPasswordExpires = null as any;
    await user.save();

    logger.info(`Password reset completed for: ${user.email}`);

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    logger.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // The user ID should be available from the auth middleware
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        },
      });
    }

    const user = await User.scope("withoutSecrets").findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toProfileObject(),
      },
    });
  } catch (error) {
    logger.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Generate API key
export const generateApiKey = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        },
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    const apiKey = user.generateApiKey();
    await user.save();

    logger.info(`API key generated for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        apiKey,
      },
    });
  } catch (error) {
    logger.error("Generate API key error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Revoke API key
export const revokeApiKey = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        },
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "User not found",
        },
      });
    }

    user.apiKey = null as any;
    await user.save();

    logger.info(`API key revoked for user: ${user.email}`);

    res.json({
      success: true,
      message: "API key revoked successfully",
    });
  } catch (error) {
    logger.error("Revoke API key error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

// Verify email
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_REQUIRED_FIELD", message: "Token is required" },
      });
    }
    const user = await User.findByEmailVerificationToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid token" },
      });
    }
    user.emailVerified = true;
    user.emailVerificationToken = null;
    await user.save();
    logger.info(`Email verified: ${user.email}`);
    res.json({ success: true, message: "Email verified" });
  } catch (error) {
    logger.error("Verify email error:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Internal error" } });
  }
};

// Resend verification
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: "MISSING_REQUIRED_FIELD", message: "Email required" },
      });
    }
    const user = await User.findByEmail(email);
    if (!user || user.emailVerified) {
      return res.json({ success: true, message: "If registered, verification link sent" });
    }
    user.generateEmailVerificationToken();
    await user.save();
    logger.info(`Verification email requested: ${email}`);
    res.json({ success: true, message: "If registered, verification link sent" });
  } catch (error) {
    logger.error("Resend verification error:", error);
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Internal error" } });
  }
};

// Logout controller
export const logout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (userId) {
      // Clear refresh token
      const user = await User.findByPk(userId);
      if (user) {
        user.refreshToken = null as any;
        user.refreshTokenExpires = null as any;
        await user.save();
      }
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};
