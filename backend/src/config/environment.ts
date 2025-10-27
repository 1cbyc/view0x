import { config } from 'dotenv';

// Load environment variables from .env file
config();

export interface EnvironmentConfig {
  // Server configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_VERSION: string;

  // Database configuration
  DATABASE_URL: string;
  DB_POOL_MAX: number;
  DB_POOL_MIN: number;
  DB_POOL_ACQUIRE: number;
  DB_POOL_IDLE: number;

  // Redis configuration
  REDIS_URL: string;
  REDIS_TTL: number;

  // JWT configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRES_IN: string;

  // Analysis configuration
  PYTHON_WORKER_PATH: string;
  SLITHER_TIMEOUT: number;
  MAX_CONTRACT_SIZE: number;
  MAX_CONCURRENT_ANALYSES: number;
  ANALYSIS_ENGINE: 'python' | 'scanner-engine' | 'both'; // New option

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // External services
  MYTHX_API_KEY?: string;
  ETHERSCAN_API_KEY?: string;

  // Email configuration (future)
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  FROM_EMAIL?: string;

  // File upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;

  // Security
  BCRYPT_ROUNDS: number;
  CORS_ORIGINS: string[];

  // Monitoring
  LOG_LEVEL: string;
  ENABLE_REQUEST_LOGGING: boolean;
}

// Default values
const defaults: Partial<EnvironmentConfig> = {
  NODE_ENV: 'development',
  PORT: 3001,
  API_VERSION: 'v1',
  DB_POOL_MAX: 10,
  DB_POOL_MIN: 2,
  DB_POOL_ACQUIRE: 30000,
  DB_POOL_IDLE: 10000,
  REDIS_TTL: 3600,
  JWT_EXPIRES_IN: '24h',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  PYTHON_WORKER_PATH: '../python',
  SLITHER_TIMEOUT: 300,
  MAX_CONTRACT_SIZE: 1048576, // 1MB
  MAX_CONCURRENT_ANALYSES: 3,
  ANALYSIS_ENGINE: 'python', // Default to Python (Slither)
  RATE_LIMIT_WINDOW_MS: 3600000, // 1 hour
  RATE_LIMIT_MAX_REQUESTS: 1000,
  MAX_FILE_SIZE: 1048576, // 1MB
  UPLOAD_DIR: './uploads',
  BCRYPT_ROUNDS: 12,
  LOG_LEVEL: 'info',
  ENABLE_REQUEST_LOGGING: true,
};

// Required environment variables
const requiredVars = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
];

// Validate and parse environment variables
function parseEnvironmentConfig(): EnvironmentConfig {
  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  // Parse CORS origins
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'https://localhost:3000'];

  // Build configuration object
  const config: EnvironmentConfig = {
    NODE_ENV: (process.env.NODE_ENV as EnvironmentConfig['NODE_ENV']) || defaults.NODE_ENV!,
    PORT: parseInt(process.env.PORT || '') || defaults.PORT!,
    API_VERSION: process.env.API_VERSION || defaults.API_VERSION!,

    // Database
    DATABASE_URL: process.env.DATABASE_URL!,
    DB_POOL_MAX: parseInt(process.env.DB_POOL_MAX || '') || defaults.DB_POOL_MAX!,
    DB_POOL_MIN: parseInt(process.env.DB_POOL_MIN || '') || defaults.DB_POOL_MIN!,
    DB_POOL_ACQUIRE: parseInt(process.env.DB_POOL_ACQUIRE || '') || defaults.DB_POOL_ACQUIRE!,
    DB_POOL_IDLE: parseInt(process.env.DB_POOL_IDLE || '') || defaults.DB_POOL_IDLE!,

    // Redis
    REDIS_URL: process.env.REDIS_URL!,
    REDIS_TTL: parseInt(process.env.REDIS_TTL || '') || defaults.REDIS_TTL!,

    // JWT
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || defaults.JWT_EXPIRES_IN!,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || defaults.REFRESH_TOKEN_EXPIRES_IN!,

    // Analysis
    PYTHON_WORKER_PATH: process.env.PYTHON_WORKER_PATH || defaults.PYTHON_WORKER_PATH!,
    SLITHER_TIMEOUT: parseInt(process.env.SLITHER_TIMEOUT || '') || defaults.SLITHER_TIMEOUT!,
    MAX_CONTRACT_SIZE: parseInt(process.env.MAX_CONTRACT_SIZE || '') || defaults.MAX_CONTRACT_SIZE!,
    MAX_CONCURRENT_ANALYSES: parseInt(process.env.MAX_CONCURRENT_ANALYSES || '') || defaults.MAX_CONCURRENT_ANALYSES!,
    ANALYSIS_ENGINE: (process.env.ANALYSIS_ENGINE as 'python' | 'scanner-engine' | 'both') || defaults.ANALYSIS_ENGINE!,

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '') || defaults.RATE_LIMIT_WINDOW_MS!,
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '') || defaults.RATE_LIMIT_MAX_REQUESTS!,

    // External services
    MYTHX_API_KEY: process.env.MYTHX_API_KEY,
    ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,

    // Email
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '') || undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FROM_EMAIL: process.env.FROM_EMAIL,

    // File upload
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '') || defaults.MAX_FILE_SIZE!,
    UPLOAD_DIR: process.env.UPLOAD_DIR || defaults.UPLOAD_DIR!,

    // Security
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '') || defaults.BCRYPT_ROUNDS!,
    CORS_ORIGINS: corsOrigins,

    // Monitoring
    LOG_LEVEL: process.env.LOG_LEVEL || defaults.LOG_LEVEL!,
    ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

function validateConfig(config: EnvironmentConfig): void {
  // Validate NODE_ENV
  if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
    throw new Error(`Invalid NODE_ENV: ${config.NODE_ENV}`);
  }

  // Validate PORT
  if (config.PORT < 1 || config.PORT > 65535) {
    throw new Error(`Invalid PORT: ${config.PORT}`);
  }

  // Validate URLs
  try {
    new URL(config.DATABASE_URL);
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${config.DATABASE_URL}`);
  }

  try {
    new URL(config.REDIS_URL);
  } catch (error) {
    throw new Error(`Invalid REDIS_URL: ${config.REDIS_URL}`);
  }

  // Validate JWT secret length
  if (config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (config.REFRESH_TOKEN_SECRET.length < 32) {
    throw new Error('REFRESH_TOKEN_SECRET must be at least 32 characters long');
  }

  // Validate timeouts and limits
  if (config.SLITHER_TIMEOUT < 10) {
    throw new Error('SLITHER_TIMEOUT must be at least 10 seconds');
  }

  if (config.MAX_CONTRACT_SIZE < 1024) {
    throw new Error('MAX_CONTRACT_SIZE must be at least 1KB');
  }

  if (config.MAX_CONCURRENT_ANALYSES < 1) {
    throw new Error('MAX_CONCURRENT_ANALYSES must be at least 1');
  }

  // Validate BCRYPT rounds
  if (config.BCRYPT_ROUNDS < 8 || config.BCRYPT_ROUNDS > 15) {
    throw new Error('BCRYPT_ROUNDS must be between 8 and 15');
  }

  // Validate CORS origins
  for (const origin of config.CORS_ORIGINS) {
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
  }
}

// Helper functions
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';
export const isProduction = (): boolean => env.NODE_ENV === 'production';
export const isTest = (): boolean => env.NODE_ENV === 'test';

// Export the configuration
export const env = parseEnvironmentConfig();

// Log configuration on startup (excluding secrets)
console.log('🔧 Environment Configuration:');
console.log(`  NODE_ENV: ${env.NODE_ENV}`);
console.log(`  PORT: ${env.PORT}`);
console.log(`  API_VERSION: ${env.API_VERSION}`);
console.log(`  DATABASE_URL: ${env.DATABASE_URL.replace(/:([^@]+)@/, ':****@')}`);
console.log(`  REDIS_URL: ${env.REDIS_URL.replace(/:([^@]+)@/, ':****@')}`);
console.log(`  MAX_CONTRACT_SIZE: ${env.MAX_CONTRACT_SIZE} bytes`);
console.log(`  MAX_CONCURRENT_ANALYSES: ${env.MAX_CONCURRENT_ANALYSES}`);
console.log(`  CORS_ORIGINS: ${env.CORS_ORIGINS.join(', ')}`);

export default env;
