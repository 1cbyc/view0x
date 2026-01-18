import {
  Model,
  DataTypes,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
} from "sequelize";
import { sequelize } from "../config/database";
import { User } from "./User";
import { Op } from "sequelize";
import { ContractInfo } from "../shared/types/analysis";

export class Analysis extends Model<
  InferAttributes<Analysis>,
  InferCreationAttributes<Analysis>
> {
  declare id: CreationOptional<string>;
  declare userId: ForeignKey<User["id"]>;
  declare contractCode: string;
  declare contractName: CreationOptional<string>;
  declare fileCount: CreationOptional<number>;
  declare status: "queued" | "processing" | "completed" | "failed";
  declare progress: CreationOptional<number>;
  declare currentStep: CreationOptional<string>;
  declare options: CreationOptional<object>;
  declare result: CreationOptional<object>;
  declare errorMessage: CreationOptional<string>;
  declare processingTimeMs: CreationOptional<number>;
  declare cacheHit: CreationOptional<boolean>;
  declare estimatedTime: CreationOptional<number>;
  declare startedAt: CreationOptional<Date>;
  declare completedAt: CreationOptional<Date>;
  declare expiresAt: CreationOptional<Date>;
  declare shareToken: CreationOptional<string>;
  declare isPublic: CreationOptional<boolean>;
  declare isFavorite: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Associations
  declare user?: User;

  // This is a getter method, not a database field. It won't be in `toJSON()`.
  public getContractInfo(): ContractInfo {
    return {
      code: this.contractCode,
      name: this.contractName,
      language: "solidity",
      size: this.contractCode.length,
      lineCount: this.contractCode.split("\n").length,
    };
  }

  // Instance methods
  updateProgress(progress: number, currentStep?: string): Promise<Analysis> {
    this.progress = progress;
    if (currentStep) {
      this.currentStep = currentStep;
    }
    return this.save();
  }

  setStarted(): Promise<Analysis> {
    this.status = "processing";
    this.startedAt = new Date();
    this.progress = 0;
    return this.save();
  }

  setCompleted(result: object): Promise<Analysis> {
    this.status = "completed";
    this.result = result;
    this.completedAt = new Date();
    this.progress = 100;
    this.currentStep = "completed";

    if (this.startedAt) {
      this.processingTimeMs = Date.now() - this.startedAt.getTime();
    }

    return this.save();
  }

  setFailed(errorMessage: string): Promise<Analysis> {
    this.status = "failed";
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
    this.currentStep = "failed";

    if (this.startedAt) {
      this.processingTimeMs = Date.now() - this.startedAt.getTime();
    }

    return this.save();
  }

  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  getDuration(): number | null {
    if (!this.startedAt || !this.completedAt) {
      return null;
    }
    return this.completedAt.getTime() - this.startedAt.getTime();
  }

  getStatusEmoji(): string {
    switch (this.status) {
      case "queued":
        return "⏳";
      case "processing":
        return "🔄";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "❓";
    }
  }

  toSummary() {
    return {
      id: this.id,
      contractName: this.contractName,
      status: this.status,
      progress: this.progress,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      duration: this.getDuration(),
      summary: this.result ? (this.result as any).summary : null,
    };
  }

  // Static methods
  static async findByUser(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: Analysis["status"];
      includeExpired?: boolean;
    },
  ): Promise<{ analyses: Analysis[]; total: number }> {
    const where: any = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    if (!options?.includeExpired) {
      where.expiresAt = {
        [Op.gt]: new Date(),
      };
    }

    const { count, rows } = await this.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: options?.limit || 20,
      offset: options?.offset || 0,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    return {
      analyses: rows,
      total: count,
    };
  }

  static async findPending(): Promise<Analysis[]> {
    return this.findAll({
      where: {
        status: ["queued", "processing"],
      },
      order: [["createdAt", "ASC"]],
    });
  }

  static async findQueuedForProcessing(
    limit: number = 10,
  ): Promise<Analysis[]> {
    return this.findAll({
      where: {
        status: "queued",
      },
      order: [["createdAt", "ASC"]],
      limit,
    });
  }

  static async getAnalyticsForUser(userId: string) {
    const analyses = await this.findAll({
      where: { userId },
      attributes: ["status", "processingTimeMs", "createdAt", "result"],
    });

    const total = analyses.length;
    const completed = analyses.filter((a) => a.status === "completed").length;
    const failed = analyses.filter((a) => a.status === "failed").length;
    const avgProcessingTime =
      analyses
        .filter((a) => a.processingTimeMs)
        .reduce((sum, a) => sum + (a.processingTimeMs || 0), 0) /
      Math.max(1, analyses.filter((a) => a.processingTimeMs).length);

    // Extract vulnerability counts from results
    const vulnerabilityCounts = analyses
      .filter((a) => a.result && (a.result as any).vulnerabilities)
      .reduce((counts: any, a) => {
        const result = a.result as any;
        if (result.vulnerabilities) {
          result.vulnerabilities.forEach((vuln: any) => {
            counts[vuln.type] = (counts[vuln.type] || 0) + 1;
          });
        }
        return counts;
      }, {});

    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      avgProcessingTime: Math.round(avgProcessingTime),
      vulnerabilityCounts,
      recentAnalyses: analyses.slice(-10).map((a) => a.toSummary()),
    };
  }

  static async cleanupExpired(): Promise<number> {
    const result = await this.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });

    return result;
  }

  static async getSystemStats() {
    const [
      totalCount,
      queuedCount,
      processingCount,
      completedCount,
      failedCount,
    ] = await Promise.all([
      this.count(),
      this.count({ where: { status: "queued" } }),
      this.count({ where: { status: "processing" } }),
      this.count({ where: { status: "completed" } }),
      this.count({ where: { status: "failed" } }),
    ]);

    const avgProcessingTime = await this.findOne({
      attributes: [
        [sequelize.fn("AVG", sequelize.col("processing_time_ms")), "avgTime"],
      ],
      where: {
        processingTimeMs: {
          [Op.ne]: null,
        } as any,
      },
      raw: true,
    });

    return {
      total: totalCount,
      queued: queuedCount,
      processing: processingCount,
      completed: completedCount,
      failed: failedCount,
      successRate: totalCount > 0 ? (completedCount / totalCount) * 100 : 0,
      avgProcessingTime: Math.round((avgProcessingTime as any)?.avgTime || 0),
    };
  }

  static generateCacheKey(contractCode: string, options?: object): string {
    const crypto = require("crypto");
    const hash = crypto
      .createHash("sha256")
      .update(contractCode + JSON.stringify(options || {}))
      .digest("hex");
    return `analysis_${hash}`;
  }
}

Analysis.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow anonymous analyses for now
      references: {
        model: User,
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    contractCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 5000000], // Max 5MB of contract code
      },
    },
    contractName: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 255],
      },
    },
    fileCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 100, // Max 100 files per analysis
      },
    },
    status: {
      type: DataTypes.ENUM("queued", "processing", "completed", "failed"),
      allowNull: false,
      defaultValue: "queued",
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    currentStep: {
      type: DataTypes.STRING,
      validate: {
        len: [0, 255],
      },
    },
    options: {
      type: DataTypes.JSONB,
      defaultValue: {},
      validate: {
        isValidOptions(value: any) {
          if (typeof value !== "object" || value === null) {
            throw new Error("Options must be a valid JSON object");
          }
        },
      },
    },
    result: {
      type: DataTypes.JSONB,
      validate: {
        isValidResult(value: any) {
          if (value !== null && (typeof value !== "object" || value === null)) {
            throw new Error("Result must be a valid JSON object or null");
          }
        },
      },
    },
    errorMessage: {
      type: DataTypes.TEXT,
    },
    processingTimeMs: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0,
      },
    },
    cacheHit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    estimatedTime: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 3600, // Max 1 hour estimate
      },
    },
    startedAt: {
      type: DataTypes.DATE,
    },
    completedAt: {
      type: DataTypes.DATE,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    shareToken: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        len: [0, 255],
      },
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: "analyses",
    timestamps: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["expires_at"],
      },
      {
        fields: ["status", "created_at"],
      },
      {
        fields: ["user_id", "created_at"],
      },
      {
        fields: ["user_id", "status"],
      },
    ],
    hooks: {
      beforeValidate: (analysis: Analysis) => {
        // Set contract name if not provided
        if (!analysis.contractName && analysis.contractCode) {
          const match = analysis.contractCode.match(/contract\s+(\w+)/);
          if (match) {
            analysis.contractName = match[1];
          }
        }
      },
      afterCreate: (analysis: Analysis) => {
        // Log analysis creation
        const { logger } = require('../utils/logger');
        logger.info('Analysis created', {
          analysisId: analysis.id,
          userId: analysis.userId || 'anonymous',
        });
      },
    },
    scopes: {
      pending: {
        where: {
          status: ["queued", "processing"],
        },
      },
      completed: {
        where: {
          status: "completed",
        },
      },
      failed: {
        where: {
          status: "failed",
        },
      },
      recent: {
        order: [["createdAt", "DESC"]],
        limit: 10,
      },
      withUser: {
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
      },
      notExpired: {
        where: {
          expiresAt: {
            [Op.gt]: new Date(),
          } as any,
        },
      },
    },
  },
);

// Define associations - moved to models/index.ts to avoid duplicates
