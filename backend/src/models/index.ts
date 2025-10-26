import { sequelize } from "../config/database";
import { User } from "./User";
import { Analysis } from "./Analysis";
import { Vulnerability } from "./Vulnerability";
import { logger } from "../utils/logger";

// 1. Initialize all models
const models = {
  User,
  Analysis,
  Vulnerability,
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

  logger.info("[MODELS] ✅ Model associations defined successfully.");
}

defineAssociations();

// 3. Synchronize all models with the database
// This function will create the tables in the correct order.
export const syncModels = async () => {
  try {
    logger.info("[MODELS] Starting database synchronization...");
    // The `force: true` option will drop tables if they already exist.
    // Use with caution, especially in production.
    const options = {
      force: process.env.NODE_ENV === "development" ? true : false,
      alter: process.env.NODE_ENV === "production" ? true : false,
    };
    await sequelize.sync(options);
    logger.info("[MODELS] ✅ All models were synchronized successfully.");
  } catch (error) {
    logger.error("[MODELS] ❌ Unable to synchronize the database:", error);
    throw error;
  }
};

// 4. Export all models and the sequelize instance
export { sequelize, User, Analysis, Vulnerability };

export default models;
