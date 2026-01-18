import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

// Configuration and utilities
import { env } from "./config/environment";
import { logger, loggerStream } from "./utils/logger";
import { initializeConnections, getConnectionHealth } from "./config/database";
import { syncModels } from "./models";
import { onAnalysisUpdate, AnalysisUpdatePayload } from "./events/appEvents";

// Middleware
import { errorHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimit";
import { requestLogger } from "./middleware/logging";

// Routes
import authRoutes from "./routes/auth";
import analysisRoutes from "./routes/analysis";
import vulnerabilityRoutes from "./routes/vulnerabilities";
import templateRoutes from "./routes/templates";
// import userRoutes from './routes/users';

// Initialize Express app
const app = express();
const server = createServer(app);

// Initialize Socket.IO for real-time features
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...env.CORS_ORIGINS, "wss:", "ws:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["X-Rate-Limit-Remaining", "X-Rate-Limit-Reset"],
  }),
);

// Basic middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (env.ENABLE_REQUEST_LOGGING) {
  app.use(morgan("combined", { stream: loggerStream }));
}
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Health check endpoint (before other routes)
app.get("/health", async (req, res) => {
  try {
    const health = await getConnectionHealth();
    const isHealthy = Object.values(health).every(
      (service) => service.status === "up",
    );

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: process.uptime(),
      services: health,
      environment: env.NODE_ENV,
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/vulnerabilities", vulnerabilityRoutes);
app.use("/api/templates", templateRoutes);
// app.use('/api/users', userRoutes);

// Root endpoint with API information
app.get("/", (req, res) => {
  res.json({
    name: "view0x Backend API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Join analysis room for real-time updates
  socket.on("subscribe-analysis", (data) => {
    const { analysisId } = data;
    if (analysisId) {
      socket.join(`analysis-${analysisId}`);
      logger.debug(`Client ${socket.id} subscribed to analysis ${analysisId}`);
    }
  });

  // Leave analysis room
  socket.on("unsubscribe-analysis", (data) => {
    const { analysisId } = data;
    if (analysisId) {
      socket.leave(`analysis-${analysisId}`);
      logger.debug(
        `Client ${socket.id} unsubscribed from analysis ${analysisId}`,
      );
    }
  });

  // Handle client disconnect
  socket.on("disconnect", (reason) => {
    logger.info(
      `WebSocket client disconnected: ${socket.id}, reason: ${reason}`,
    );
  });

  // Handle connection errors
  socket.on("error", (error) => {
    logger.error(`WebSocket error for client ${socket.id}:`, error);
  });
});

// Listen for internal application events and broadcast them via Socket.IO
onAnalysisUpdate((payload: AnalysisUpdatePayload) => {
  const room = `analysis-${payload.analysisId}`;
  logger.info(`[SOCKET] Broadcasting analysis update to room ${room}`, {
    status: payload.status,
    progress: payload.progress,
  });
  io.to(room).emit("analysis:update", payload);
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "API endpoint not found",
    },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Export app, server, and io for use in server.ts and testing
export { app, server, io };

// Initialize database connections and start server
export async function initializeApp(): Promise<void> {
  try {
    logger.info("Initializing view0x Backend...");
    await initializeConnections();
    logger.info("Database connections established");
    await syncModels();
    logger.info("Database models synchronized");
    logger.info("Application initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    throw error;
  }
}

// Graceful shutdown handler
export async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info("HTTP server closed");
  });

  io.close(() => {
    logger.info("WebSocket server closed");
  });

  logger.info("Graceful shutdown completed");
  process.exit(0);
}

// Handle process signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
