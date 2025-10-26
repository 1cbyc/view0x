import { Sequelize } from "sequelize";
import Redis from "ioredis";
import { logger } from "../utils/logger";

// Database configuration
const dbUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/secure_audit_dev";
const isPostgres = dbUrl.startsWith("postgres");
const isSQLite = false;

const dbConfig = {
  url: dbUrl,
  options: {
    dialect: "postgres" as const,
    logging:
      process.env.NODE_ENV === "development"
        ? (sql: string) => logger.debug("SQL:", sql)
        : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || "10"),
      min: parseInt(process.env.DB_POOL_MIN || "2"),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || "30000"),
      idle: parseInt(process.env.DB_POOL_IDLE || "10000"),
    },
    retry: {
      max: 3,
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
      ],
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true,
    },
  },
};

// Redis configuration
const redisConfig = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
  options: {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000,
  },
};

// Initialize Sequelize
export const sequelize = new Sequelize(dbConfig.url, dbConfig.options);

// Initialize Redis clients
export const redis = new Redis(redisConfig.url, {
  ...redisConfig.options,
  keyPrefix: "secure-audit:",
});

// Separate Redis clients for Bull queue as per library requirements
// See: https://github.com/OptimalBits/bull/issues/1873
export const bullQueueClient = new Redis(redisConfig.url, {
  ...redisConfig.options,
  maxRetriesPerRequest: null, // Bull manages its own retries
  enableReadyCheck: false,
  keyPrefix: "secure-audit:queue:",
});

export const bullQueueSubscriber = new Redis(redisConfig.url, {
  ...redisConfig.options,
  maxRetriesPerRequest: null, // Bull manages its own retries
  enableReadyCheck: false,
  keyPrefix: "secure-audit:queue:",
});

// Redis client for caching
const cacheRedis = new Redis(redisConfig.url, {
  ...redisConfig.options,
  keyPrefix: "secure-audit:cache:",
});

// Database connection test
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established successfully");
    return true;
  } catch (error) {
    logger.error("❌ Unable to connect to database:", error);
    return false;
  }
};

// Redis connection test
export const testRedisConnection = async (): Promise<boolean> => {
  try {
    const result = await redis.ping();
    if (result === "PONG") {
      logger.info("✅ Redis connection established successfully");
      return true;
    }
    throw new Error("Redis ping failed");
  } catch (error) {
    logger.error("❌ Unable to connect to Redis:", error);
    return false;
  }
};

// Initialize all connections
export const initializeConnections = async (): Promise<void> => {
  const dbConnected = await testDatabaseConnection();
  const redisConnected = await testRedisConnection();

  if (!dbConnected || !redisConnected) {
    throw new Error("Failed to establish required database connections");
  }

  // Sync database in development
  if (process.env.NODE_ENV === "development") {
    try {
      await sequelize.sync({ force: false });
      logger.info("✅ Database synchronized");
    } catch (error) {
      logger.error("❌ Database sync failed:", error);
      throw error;
    }
  }
};

// Graceful shutdown
export const closeConnections = async (): Promise<void> => {
  try {
    await sequelize.close();
    logger.info("📴 Database connection closed");

    redis.disconnect();
    bullQueueClient.disconnect();
    bullQueueSubscriber.disconnect();
    cacheRedis.disconnect();
    logger.info("📴 Redis connections closed");
  } catch (error) {
    logger.error("❌ Error closing connections:", error);
  }
};

// Health check for monitoring
export const getConnectionHealth = async () => {
  const health = {
    database: { status: "down", responseTime: 0 },
    redis: { status: "down", responseTime: 0 },
    cache: { status: "down", responseTime: 0 },
  };

  // Test database
  try {
    const start = Date.now();
    await sequelize.authenticate();
    health.database = {
      status: "up",
      responseTime: Date.now() - start,
    };
  } catch (error) {
    health.database.status = "down";
  }

  // Test Redis
  try {
    const start = Date.now();
    await redis.ping();
    health.redis = {
      status: "up",
      responseTime: Date.now() - start,
    };
  } catch (error) {
    health.redis.status = "down";
  }

  // Test cache Redis
  try {
    const start = Date.now();
    await cacheRedis.ping();
    health.cache = {
      status: "up",
      responseTime: Date.now() - start,
    };
  } catch (error) {
    health.cache.status = "down";
  }

  return health;
};

// Error handlers
redis.on("error", (error) => {
  logger.error("Redis error:", error);
});

redis.on("connect", () => {
  logger.info("Redis connected");
});

redis.on("ready", () => {
  logger.info("Redis ready");
});

redis.on("close", () => {
  logger.info("Redis connection closed");
});

// Export individual clients for specific use cases
export { redis as defaultRedis, queueRedis, cacheRedis };
