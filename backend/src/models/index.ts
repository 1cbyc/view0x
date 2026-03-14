import { sequelize } from "../config/database";
import { User } from "./User";
import { Analysis } from "./Analysis";
import { Vulnerability } from "./Vulnerability";
import { VulnerabilityComment } from "./VulnerabilityComment";
import { ActivityLog } from "./ActivityLog";
import { AnalysisTemplate } from "./AnalysisTemplate";
import ApiAnalytics from "./ApiAnalytics";
import { logger } from "../utils/logger";

// 1. Initialize all models
const models = {
  User,
  Analysis,
  Vulnerability,
  VulnerabilityComment,
  ActivityLog,
  AnalysisTemplate,
  ApiAnalytics,
};

// 2. Define associations (relationships) between models
// This is crucial for Sequelize to understand the foreign key constraints.
function defineAssociations() {
  logger.info("[MODELS] Defining model associations...");

  // User <-> Analysis (One-to-Many)
  User.hasMany(Analysis, {
    foreignKey: "userId",
    as: "analyses",
    onDelete: "CASCADE",
  });
  Analysis.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // Analysis <-> Vulnerability (One-to-Many)
  Analysis.hasMany(Vulnerability, {
    foreignKey: "analysisId",
    as: "vulnerabilities",
    onDelete: "CASCADE",
  });
  Vulnerability.belongsTo(Analysis, {
    foreignKey: "analysisId",
    as: "analysis",
  });

  // Vulnerability <-> VulnerabilityComment (One-to-Many)
  Vulnerability.hasMany(VulnerabilityComment, {
    foreignKey: "vulnerabilityId",
    as: "comments",
    onDelete: "CASCADE",
  });
  VulnerabilityComment.belongsTo(Vulnerability, {
    foreignKey: "vulnerabilityId",
    as: "vulnerability",
  });

  // User <-> VulnerabilityComment (One-to-Many)
  User.hasMany(VulnerabilityComment, {
    foreignKey: "userId",
    as: "comments",
    onDelete: "CASCADE",
  });
  VulnerabilityComment.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // User <-> ActivityLog (One-to-Many)
  User.hasMany(ActivityLog, {
    foreignKey: "userId",
    as: "activityLogs",
    onDelete: "CASCADE",
  });
  ActivityLog.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // User <-> AnalysisTemplate (One-to-Many)
  User.hasMany(AnalysisTemplate, {
    foreignKey: "userId",
    as: "templates",
    onDelete: "CASCADE",
  });
  AnalysisTemplate.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  logger.info("[MODELS] Model associations defined successfully.");
}

defineAssociations();

// 3. Synchronize all models with the database
// This function will create the tables in the correct order.
export const syncModels = async () => {
  try {
    logger.info("[MODELS] Starting database synchronization...");
    
    // SAFE SYNC OPTIONS FOR PRODUCTION
    // Don't use force or alter in production - can cause data loss
    const options = {
      force: false,    // NEVER force in production
      alter: false,    // Don't alter tables automatically
    };
    
    // Try to sync, but don't fail if tables already exist
    try {
      await sequelize.sync(options);
      logger.info("[MODELS] All models were synchronized successfully.");
    } catch (syncError: any) {
      // If sync fails, log warning but continue (tables might already exist)
      logger.warn("[MODELS] Sync had issues (tables may already exist):", syncError?.message || syncError);
      logger.info("[MODELS] Continuing with existing database structure...");
    }
  } catch (error) {
    logger.error("[MODELS] ❌ Unable to synchronize the database:", error);
    // Don't throw - allow app to start even if sync fails
    logger.warn("[MODELS] Starting with potentially incomplete database sync...");
  }
};

// 4. Export all models and the sequelize instance
export { sequelize, User, Analysis, Vulnerability };

export default models;
