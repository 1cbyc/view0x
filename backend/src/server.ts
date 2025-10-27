import "dotenv/config"; // Ensure environment variables are loaded first
import { server, initializeApp } from "./app";
import { env } from "./config/environment";
import { logger } from "./utils/logger";

const startServer = async () => {
  try {
    logger.info("----------------------------------------------------");
    logger.info("[SERVER STARTUP] Beginning server startup process...");
    logger.info(`[SERVER STARTUP] Environment: ${env.NODE_ENV}`);
    logger.info(`[SERVER STARTUP] Log Level: ${env.LOG_LEVEL}`);
    logger.info("----------------------------------------------------");

    logger.info("[SERVER STARTUP] Step 1: Initializing application...");
    await initializeApp();
    logger.info(
      "[SERVER STARTUP] ✅ Step 1 Complete: Application initialized.",
    );

    logger.info(
      `[SERVER STARTUP] Step 2: Starting HTTP server on port ${env.PORT}...`,
    );
    server.listen(env.PORT, () => {
      logger.info("----------------------------------------------------");
      logger.info(
        `[SERVER] ✅ Server is now listening on http://localhost:${env.PORT}`,
      );
      logger.info(`[SERVER] API Version: ${env.API_VERSION}`);
      logger.info(`[SERVER] Health check: http://localhost:${env.PORT}/health`);
      logger.info("----------------------------------------------------");
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") {
        logger.error("[SERVER] Unexpected server error:", error);
        throw error;
      }

      switch (error.code) {
        case "EACCES":
          logger.error(
            `[SERVER] ❌ Port ${env.PORT} requires elevated privileges. Shutting down.`,
          );
          process.exit(1);
          break;
        case "EADDRINUSE":
          logger.error(
            `[SERVER] ❌ Port ${env.PORT} is already in use. Shutting down.`,
          );
          logger.warn(
            `[SERVER] Hint: Find and stop the conflicting process with 'lsof -i :${env.PORT}' and 'kill -9 <PID>'`,
          );
          process.exit(1);
          break;
        default:
          logger.error("[SERVER] An unknown server error occurred:", error);
          throw error;
      }
    });
  } catch (error) {
    logger.error(
      "[SERVER] ❌ A critical error occurred during startup:",
      error,
    );
    logger.error("[SERVER] Application failed to start. Shutting down.");
    process.exit(1);
  }
};

// Execute the startup process
startServer();
