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
    findByPk: jest.fn(),
  },
}));

jest.mock('../../models/Analysis', () => ({
  Analysis: {
    create: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock('../../workers/analysisWorker', () => ({
  analysisQueue: {
    add: jest.fn(),
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
import { AnalysisService } from '../../services/analysisService';
import { User } from '../../models/User';
import { Analysis } from '../../models/Analysis';

describe('AnalysisService', () => {
  let analysisService: AnalysisService;
  let mockUser: jest.Mocked<User>;

  beforeEach(() => {
    analysisService = new AnalysisService();
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      plan: 'free',
      canAnalyze: jest.fn().mockReturnValue(true),
      incrementUsage: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an analysis successfully', async () => {
      const contractCode = 'pragma solidity ^0.8.0; contract Test {}';
      const contractName = 'TestContract';
      const mockAnalysis = {
        id: 'analysis-123',
        userId: mockUser.id,
        contractCode,
        contractName,
        status: 'queued',
        progress: 0,
        options: {},
        currentStep: null,
        errorMessage: null,
        estimatedTime: null,
        result: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        getContractInfo: jest.fn().mockReturnValue({
          code: contractCode,
          name: contractName,
          language: 'solidity',
          size: contractCode.length,
          lineCount: contractCode.split('\n').length,
        }),
      };

      (Analysis.create as jest.Mock).mockResolvedValue(mockAnalysis);

      const result = await analysisService.create(mockUser.id, {
        contractCode,
        contractName,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('analysis-123');
      expect(result.status).toBe('queued');
      expect(result.contractInfo.code).toBe(contractCode);
      expect(Analysis.create).toHaveBeenCalled();
    });

    it('should handle cache hits correctly', async () => {
      const contractCode = 'pragma solidity ^0.8.0; contract Test {}';
      const { cacheRedis } = require('../../config/database');
      
      // Mock cached result
      cacheRedis.get.mockResolvedValueOnce(JSON.stringify({
        summary: { totalVulnerabilities: 0 },
        vulnerabilities: [],
      }));

      const mockCachedAnalysis = {
        id: 'cached-analysis-123',
        userId: mockUser.id,
        contractCode,
        contractName: 'Cached Contract',
        status: 'completed',
        progress: 100,
        options: {},
        currentStep: null,
        errorMessage: null,
        estimatedTime: null,
        result: { summary: { totalVulnerabilities: 0 }, vulnerabilities: [] },
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        getContractInfo: jest.fn().mockReturnValue({
          code: contractCode,
          language: 'solidity',
          size: contractCode.length,
          lineCount: contractCode.split('\n').length,
        }),
      };

      (Analysis.create as jest.Mock).mockResolvedValue(mockCachedAnalysis);

      const result = await analysisService.create(mockUser.id, {
        contractCode,
      });

      expect(result.status).toBe('completed');
      expect(Analysis.create).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('should return analysis by id', async () => {
      const contractCode = 'pragma solidity ^0.8.0; contract Test {}';
      const mockAnalysis = {
        id: 'analysis-123',
        userId: mockUser.id,
        contractCode,
        status: 'completed',
        progress: 100,
        options: {},
        currentStep: null,
        errorMessage: null,
        estimatedTime: null,
        result: null,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        getContractInfo: jest.fn().mockReturnValue({
          code: contractCode,
          language: 'solidity',
          size: contractCode.length,
          lineCount: contractCode.split('\n').length,
        }),
      };

      (Analysis.findByPk as jest.Mock).mockResolvedValue(mockAnalysis);

      const result = await analysisService.getById('analysis-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('analysis-123');
      expect(Analysis.findByPk).toHaveBeenCalledWith('analysis-123', expect.any(Object));
    });

    it('should throw error if analysis not found', async () => {
      (Analysis.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        analysisService.getById('non-existent')
      ).rejects.toThrow('Analysis job not found');
    });
  });
});
