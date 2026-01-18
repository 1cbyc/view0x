// Mock database FIRST before any imports
jest.mock('../../config/database', () => ({
  sequelize: {
    define: jest.fn(),
    transaction: jest.fn((callback) => callback({})),
  },
  cacheRedis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
  },
}));

// Mock models
jest.mock('../../models/User', () => ({
  User: {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Now import after mocks
import { Request, Response } from 'express';
import { register, login } from '../../controllers/auth';
import { User } from '../../models/User';
import { AuthenticationError, ValidationError } from '../../middleware/errorHandler';

describe('Auth Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        toProfileObject: jest.fn().mockReturnValue({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        }),
        setRefreshToken: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findByEmail as jest.Mock).mockResolvedValue(null);
      (User.createUser as jest.Mock).mockResolvedValue(mockUser);

      await register(mockReq as Request, mockRes as Response);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.createUser).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        company: undefined,
        plan: 'free',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should reject registration with existing email', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      (User.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      await register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        checkPassword: jest.fn().mockResolvedValue(true),
        setRefreshToken: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
        toProfileObject: jest.fn().mockReturnValue({
          id: 'user-123',
          email: 'test@example.com',
        }),
        lastLogin: null,
      };

      (User.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await login(mockReq as Request, mockRes as Response);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.checkPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('should reject login with invalid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        checkPassword: jest.fn().mockResolvedValue(false),
      };

      (User.findByEmail as jest.Mock).mockResolvedValue(mockUser);

      await login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
