import { AnalysisService } from '../../services/analysisService';
import { User } from '../../models/User';
import { Analysis } from '../../models/Analysis';

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../models/Analysis');
jest.mock('../../config/database', () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback({})),
  },
}));

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
      };

      (Analysis.create as jest.Mock).mockResolvedValue(mockAnalysis);

      const result = await analysisService.create(mockUser.id, {
        contractCode,
        contractName,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.status).toBe('queued');
      expect(result.contractInfo.code).toBe(contractCode);
      expect(Analysis.create).toHaveBeenCalled();
    });

    it('should throw error if user cannot analyze', async () => {
      mockUser.canAnalyze = jest.fn().mockReturnValue(false);

      await expect(
        analysisService.create(mockUser.id, {
          contractCode: 'pragma solidity ^0.8.0; contract Test {}',
        })
      ).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return analysis by id', async () => {
      const mockAnalysis = {
        id: 'analysis-123',
        userId: mockUser.id,
        contractCode: 'pragma solidity ^0.8.0; contract Test {}',
      };

      (Analysis.findByPk as jest.Mock).mockResolvedValue(mockAnalysis);

      const result = await analysisService.getById('analysis-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('analysis-123');
      expect(Analysis.findByPk).toHaveBeenCalledWith('analysis-123');
    });

    it('should return null if analysis not found', async () => {
      (Analysis.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await analysisService.getById('non-existent');

      expect(result).toBeNull();
    });
  });
});
