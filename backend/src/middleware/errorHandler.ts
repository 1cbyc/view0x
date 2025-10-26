import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

export interface APIError extends Error {
  statusCode?: number;
  code?: string;
  field?: string;
  details?: any;
}

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_SERVER_ERROR';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error classes
export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'ALREADY_EXISTS');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

// Error handler middleware
export const errorHandler = (
  error: APIError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Default error values
  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_SERVER_ERROR';
  let message = error.message || 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = 'ALREADY_EXISTS';
    message = 'Resource already exists';
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = 'Invalid reference to related resource';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }

  // Log error details
  const errorLog = {
    error: {
      name: error.name,
      message: error.message,
      code,
      statusCode,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
    user: (req as any).user || null,
    timestamp: new Date().toISOString(),
  };

  // Log based on severity
  if (statusCode >= 500) {
    logger.error('Server error:', errorLog);
  } else if (statusCode >= 400) {
    logger.warn('Client error:', errorLog);
  } else {
    logger.info('Request error:', errorLog);
  }

  // Format error response
  const errorResponse: any = {
    success: false,
    error: {
      code,
      message,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (req as any).id || 'unknown',
    },
  };

  // Add additional error details in development
  if (env.NODE_ENV === 'development') {
    errorResponse.error.details = {
      name: error.name,
      stack: error.stack,
      ...error.details,
    };

    // Add field information for validation errors
    if (error.field) {
      errorResponse.error.field = error.field;
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Handle 404 errors for API routes
export const notFoundHandler = (req: Request, res: Response) => {
  const error = new NotFoundError(`API endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      path: req.path,
      method: req.method,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: (req as any).id || 'unknown',
    },
  });
};

// Validation error formatter
export const formatValidationError = (errors: any[]): string => {
  if (!Array.isArray(errors)) {
    return 'Validation failed';
  }

  const messages = errors.map(error => {
    if (error.path && error.message) {
      return `${error.path}: ${error.message}`;
    }
    return error.message || 'Validation error';
  });

  return messages.join(', ');
};

// Database error handler
export const handleDatabaseError = (error: any): AppError => {
  if (error.name === 'SequelizeValidationError') {
    const message = formatValidationError(error.errors);
    return new ValidationError(message);
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors?.[0]?.path || 'unknown';
    return new ConflictError(`${field} already exists`);
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new ValidationError('Invalid reference to related resource');
  }

  if (error.name === 'SequelizeConnectionError') {
    return new AppError('Database connection failed', 503, 'DATABASE_ERROR');
  }

  // Return generic database error for unhandled cases
  return new AppError('Database operation failed', 500, 'DATABASE_ERROR');
};

export default errorHandler;
