// IMPORTANT: Mock database BEFORE importing anything else
jest.mock('../config/database', () => {
  const mockSequelize = {
    define: jest.fn(),
    transaction: jest.fn((callback) => callback({})),
  };
  return {
    sequelize: mockSequelize,
    cacheRedis: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
    },
    initializeConnections: jest.fn().mockResolvedValue(true),
    getConnectionHealth: jest.fn().mockResolvedValue({
      database: { status: 'up' },
      redis: { status: 'up' },
    }),
  };
});

// Mock logger before any imports
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment variables if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/view0x_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-token-secret-key-for-testing-only';
