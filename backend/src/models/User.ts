import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  NonAttribute,
} from "sequelize";
import { sequelize } from "../config/database";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/environment";
import { Op } from "sequelize";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare password: string;
  declare name: string;
  declare plan: "free" | "pro" | "enterprise";
  declare apiKey: CreationOptional<string>;
  declare usageLimit: CreationOptional<number>;
  declare usageCount: CreationOptional<number>;
  declare emailVerified: CreationOptional<boolean>;
  declare avatar: CreationOptional<string>;
  declare company: CreationOptional<string>;
  declare lastLogin: CreationOptional<Date>;
  declare resetPasswordToken: CreationOptional<string>;
  declare resetPasswordExpires: CreationOptional<Date>;
  declare emailVerificationToken: CreationOptional<string>;
  declare twoFactorSecret: CreationOptional<string>;
  declare twoFactorEnabled: CreationOptional<boolean>;
  declare refreshToken: CreationOptional<string>;
  declare refreshTokenExpires: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Instance methods
  async checkPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  async setPassword(password: string): Promise<void> {
    this.password = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  generateApiKey(): string {
    this.apiKey = `sa_${uuidv4().replace(/-/g, "")}`;
    return this.apiKey;
  }

  generateResetToken(): string {
    this.resetPasswordToken = uuidv4();
    this.resetPasswordExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return this.resetPasswordToken;
  }

  generateEmailVerificationToken(): string {
    this.emailVerificationToken = uuidv4();
    return this.emailVerificationToken;
  }

  setRefreshToken(token: string, expiresIn: string = "7d"): void {
    this.refreshToken = token;
    const expiry = new Date();

    // Parse expiration string (e.g., '7d', '24h', '30m')
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case "d":
          expiry.setDate(expiry.getDate() + value);
          break;
        case "h":
          expiry.setHours(expiry.getHours() + value);
          break;
        case "m":
          expiry.setMinutes(expiry.getMinutes() + value);
          break;
      }
    } else {
      // Default to 7 days
      expiry.setDate(expiry.getDate() + 7);
    }

    this.refreshTokenExpires = expiry;
  }

  isRefreshTokenValid(): boolean {
    if (!this.refreshToken || !this.refreshTokenExpires) {
      return false;
    }
    return new Date() < this.refreshTokenExpires;
  }

  canAnalyze(): boolean {
    if (this.plan === "pro" || this.plan === "enterprise") {
      return true; // Unlimited for paid plans
    }
    return this.usageCount < this.usageLimit;
  }

  incrementUsage(): Promise<User> {
    this.usageCount++;
    return this.save();
  }

  getUsagePercentage(): number {
    if (this.plan === "pro" || this.plan === "enterprise") {
      return 0; // Unlimited
    }
    return Math.round((this.usageCount / this.usageLimit) * 100);
  }

  toSafeObject() {
    const {
      password,
      resetPasswordToken,
      resetPasswordExpires,
      emailVerificationToken,
      refreshToken,
      refreshTokenExpires,
      ...safeUser
    } = this.toJSON();

    return safeUser;
  }

  toProfileObject() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      plan: this.plan,
      avatar: this.avatar,
      company: this.company,
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
    };
  }

  // Static methods
  static async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email: email.toLowerCase() } });
  }

  static async findByApiKey(apiKey: string): Promise<User | null> {
    return this.findOne({ where: { apiKey } });
  }

  static async findByResetToken(token: string): Promise<User | null> {
    return this.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },
    });
  }

  static async findByEmailVerificationToken(
    token: string,
  ): Promise<User | null> {
    return this.findOne({
      where: { emailVerificationToken: token },
    });
  }

  static async createUser(userData: {
    email: string;
    password: string;
    name: string;
    company?: string;
    plan?: "free" | "pro" | "enterprise";
  }): Promise<User> {
    const user = new User();
    user.email = userData.email.toLowerCase();
    user.name = userData.name;
    if (userData.company) {
      user.company = userData.company;
    }
    user.plan = userData.plan || "free";
    user.generateApiKey();
    user.generateEmailVerificationToken();
    await user.setPassword(userData.password);

    return user.save();
  }

  static getPlanLimits(plan: "free" | "pro" | "enterprise") {
    const limits = {
      free: {
        analysesPerMonth: 10,
        concurrentAnalyses: 1,
        apiAccess: false,
        prioritySupport: false,
        teamMembers: 0,
        customIntegrations: false,
        advancedReporting: false,
        whiteLabel: false,
      },
      pro: {
        analysesPerMonth: -1, // Unlimited
        concurrentAnalyses: 3,
        apiAccess: true,
        prioritySupport: true,
        teamMembers: 5,
        customIntegrations: true,
        advancedReporting: true,
        whiteLabel: false,
      },
      enterprise: {
        analysesPerMonth: -1, // Unlimited
        concurrentAnalyses: 10,
        apiAccess: true,
        prioritySupport: true,
        teamMembers: -1, // Unlimited
        customIntegrations: true,
        advancedReporting: true,
        whiteLabel: true,
      },
    };

    return limits[plan];
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        len: [3, 255],
      },
      set(value: string) {
        this.setDataValue("email", value.toLowerCase());
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [60, 60], // bcrypt hash length
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    plan: {
      type: DataTypes.ENUM("free", "pro", "enterprise"),
      allowNull: false,
      defaultValue: "free",
    },
    apiKey: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        len: [35, 35], // sa_ + 32 chars
      },
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 0,
      },
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    avatar: {
      type: DataTypes.TEXT,
      validate: {
        isUrl: true,
      },
    },
    company: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 255],
      },
    },
    lastLogin: {
      type: DataTypes.DATE,
    },
    resetPasswordToken: {
      type: DataTypes.UUID,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
    },
    emailVerificationToken: {
      type: DataTypes.UUID,
    },
    refreshToken: {
      type: DataTypes.TEXT,
    },
    refreshTokenExpires: {
      type: DataTypes.DATE,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    paranoid: false, // Don't use soft deletes for users
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        unique: true,
        fields: ["api_key"],
        where: {
          api_key: {
            [Op.ne]: null,
          },
        },
      },
      {
        fields: ["plan"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["reset_password_token"],
        where: {
          reset_password_token: {
            [Op.ne]: null,
          },
        },
      },
      {
        fields: ["email_verification_token"],
        where: {
          email_verification_token: {
            [Op.ne]: null,
          },
        },
      },
    ],
    hooks: {
      beforeValidate: (user: User) => {
        // Set usage limits based on plan
        const limits = User.getPlanLimits(user.plan);
        if (limits.analysesPerMonth === -1) {
          user.usageLimit = 999999; // Large number for unlimited
        } else {
          user.usageLimit = limits.analysesPerMonth;
        }
      },
    },
    scopes: {
      withoutPassword: {
        attributes: { exclude: ["password"] },
      },
      withoutSecrets: {
        attributes: {
          exclude: [
            "password",
            "resetPasswordToken",
            "resetPasswordExpires",
            "emailVerificationToken",
            "refreshToken",
            "refreshTokenExpires",
          ],
        },
      },
      active: {
        where: {
          emailVerified: true,
        },
      },
      byPlan: (plan: "free" | "pro" | "enterprise") => ({
        where: { plan },
      }),
    },
  },
);
