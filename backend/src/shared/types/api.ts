// Shared TypeScript interfaces for API responses and requests

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  statusCode?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Generic list response
export interface ListResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    workers: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

// Error codes enum for consistent error handling
export enum ErrorCodes {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONCURRENT_LIMIT_EXCEEDED = 'CONCURRENT_LIMIT_EXCEEDED',

  // Analysis errors
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  ANALYSIS_TIMEOUT = 'ANALYSIS_TIMEOUT',
  INVALID_CONTRACT = 'INVALID_CONTRACT',
  COMPILATION_ERROR = 'COMPILATION_ERROR',

  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR'
}

// Request validation schemas (to be used with joi/zod)
export interface CreateAnalysisValidation {
  contractCode: string;
  contractName?: string;
  options?: {
    includeGasOptimization?: boolean;
    includeCodeQuality?: boolean;
    severityFilter?: ('HIGH' | 'MEDIUM' | 'LOW')[];
    timeout?: number;
  };
}

export interface RegisterValidation {
  name: string;
  email: string;
  password: string;
  company?: string;
  agreeToTerms: boolean;
}

export interface LoginValidation {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// API versioning
export interface APIVersion {
  version: string;
  supportedUntil?: string;
  deprecated?: boolean;
  changes?: string[];
}

// Webhook types for external integrations
export interface WebhookPayload {
  event: 'analysis.completed' | 'analysis.failed' | 'user.created' | 'subscription.updated';
  data: any;
  timestamp: string;
  signature: string;
  version: string;
}

export interface WebhookSubscription {
  id: string;
  userId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
  failureCount: number;
}

// Batch operations
export interface BatchRequest<T> {
  items: T[];
  options?: {
    continueOnError?: boolean;
    maxConcurrency?: number;
  };
}

export interface BatchResponse<T> {
  results: Array<{
    success: boolean;
    data?: T;
    error?: APIError;
    index: number;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    processingTime: number;
  };
}

// File upload types
export interface FileUploadRequest {
  files: File[];
  options?: {
    extractImports?: boolean;
    validateSyntax?: boolean;
  };
}

export interface FileUploadResponse {
  files: Array<{
    filename: string;
    size: number;
    type: string;
    content: string;
    valid: boolean;
    errors?: string[];
  }>;
  mainContract?: string;
  dependencies: string[];
}

// System metrics for admin/monitoring
export interface SystemMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  analyses: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    averageProcessingTime: number;
  };
  users: {
    total: number;
    active: number;
    newToday: number;
  };
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    workers: number;
  };
}

// Export utility type for making all fields optional (for PATCH requests)
export type PartialUpdate<T> = Partial<T>;

// Export utility type for creating requests with only specific fields
export type CreateRequest<T, K extends keyof T> = Pick<T, K>;
export type UpdateRequest<T, K extends keyof T> = Partial<Pick<T, K>>;
