import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Generate unique request ID
  req.id = uuidv4();
  req.startTime = Date.now();

  // Skip logging for health checks and static assets
  if (shouldSkipLogging(req.path)) {
    return next();
  }

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    timestamp: new Date().toISOString(),
  });

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.send to log response
  res.send = function(body: any) {
    logResponse(req, res, body);
    return originalSend.call(this, body);
  };

  // Override res.json to log response
  res.json = function(body: any) {
    logResponse(req, res, body);
    return originalJson.call(this, body);
  };

  // Log when response finishes
  res.on('finish', () => {
    logResponseFinish(req, res);
  });

  // Log errors
  res.on('error', (error) => {
    logger.error('Response error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
    });
  });

  next();
};

// Helper function to determine if logging should be skipped
function shouldSkipLogging(path: string): boolean {
  const skipPaths = [
    '/health',
    '/favicon.ico',
    '/robots.txt',
  ];

  return skipPaths.includes(path) || path.startsWith('/static/');
}

// Log response details
function logResponse(req: Request, res: Response, body: any) {
  const duration = Date.now() - req.startTime;
  const responseSize = Buffer.isBuffer(body) ? body.length : JSON.stringify(body).length;

  logger.info('Response sent', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    responseSize: `${responseSize} bytes`,
    success: res.statusCode < 400,
  });
}

// Log when response is completely finished
function logResponseFinish(req: Request, res: Response) {
  const duration = Date.now() - req.startTime;

  // Determine log level based on status code
  const logLevel = res.statusCode >= 500 ? 'error' :
                   res.statusCode >= 400 ? 'warn' : 'info';

  logger[logLevel]('Request completed', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
}

// Performance monitoring middleware
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    // Log slow requests
    if (duration > 1000) { // Requests taking more than 1 second
      logger.warn('Slow request detected', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
      });
    }

    // Log performance metrics for analysis endpoints
    if (req.path.startsWith('/api/analysis')) {
      logger.info('Analysis endpoint performance', {
        requestId: req.id,
        endpoint: req.path,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        category: 'performance',
      });
    }
  });

  next();
};

// Security event logger
export const securityLogger = (event: string, req: Request, details?: any) => {
  logger.warn('Security event', {
    event,
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    category: 'security',
    ...details,
  });
};

// User activity logger
export const logUserActivity = (
  userId: string,
  action: string,
  resource?: string,
  details?: any,
  req?: Request
) => {
  logger.info('User activity', {
    userId,
    action,
    resource,
    requestId: req?.id,
    ip: req?.ip,
    userAgent: req?.get('User-Agent'),
    timestamp: new Date().toISOString(),
    category: 'user_activity',
    ...details,
  });
};

// Analysis event logger
export const logAnalysisEvent = (
  event: 'started' | 'completed' | 'failed' | 'queued',
  analysisId: string,
  userId?: string,
  details?: any
) => {
  logger.info('Analysis event', {
    event,
    analysisId,
    userId,
    timestamp: new Date().toISOString(),
    category: 'analysis',
    ...details,
  });
};

export default requestLogger;
