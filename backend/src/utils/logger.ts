import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.stack ? `\n${info.stack}` : ''
    }`
  )
);

// Define which logs to show based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: level(),
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),

  // File transport for errors
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),

  // File transport for all logs
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
export const loggerStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for different log levels
export const logError = (message: string, error?: any) => {
  if (error && error.stack) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  } else if (error) {
    logger.error(`${message}: ${error.toString()}`);
  } else {
    logger.error(message);
  }
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: any) => {
  logger.http(message, meta);
};

// Structured logging helpers
export const logRequest = (req: any, res: any, duration: number) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
  });
};

export const logAnalysisStart = (jobId: string, userId?: string) => {
  logger.info('Analysis started', {
    jobId,
    userId,
    event: 'analysis_start',
  });
};

export const logAnalysisComplete = (jobId: string, duration: number, userId?: string) => {
  logger.info('Analysis completed', {
    jobId,
    userId,
    duration: `${duration}ms`,
    event: 'analysis_complete',
  });
};

export const logAnalysisError = (jobId: string, error: any, userId?: string) => {
  logger.error('Analysis failed', {
    jobId,
    userId,
    error: error.message,
    stack: error.stack,
    event: 'analysis_error',
  });
};

export const logDatabaseQuery = (query: string, duration: number) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database query', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration: `${duration}ms`,
    });
  }
};

export const logWorkerJob = (jobId: string, jobType: string, status: 'start' | 'complete' | 'error', meta?: any) => {
  logger.info(`Worker job ${status}`, {
    jobId,
    jobType,
    event: `worker_${status}`,
    ...meta,
  });
};

export const logSecurity = (event: string, details: any, severity: 'low' | 'medium' | 'high' = 'medium') => {
  logger.warn('Security event', {
    event,
    severity,
    ...details,
    category: 'security',
  });
};

export const logPerformance = (operation: string, duration: number, meta?: any) => {
  logger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...meta,
    category: 'performance',
  });
};

// Export default logger
export default logger;
