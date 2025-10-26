import { Request, Response } from "express";
import { User } from "../models/User";
import { Analysis } from "../models/Analysis";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../middleware/errorHandler";
import { logger } from "../utils/logger";

// MOCK: In the future, this will come from a queue/worker service
const analysisService = {
  queueAnalysis: async (analysis: Analysis) => {
    logger.info(`Mock queuing analysis job: ${analysis.id}`);
    // Simulate processing
    setTimeout(async () => {
      const job = await Analysis.findByPk(analysis.id);
      if (job) {
        await job.setStarted();
        logger.info(`Mock processing analysis job: ${job.id}`);
      }
    }, 5000); // 5 seconds delay

    setTimeout(async () => {
      const job = await Analysis.findByPk(analysis.id);
      if (job) {
        // Mock result
        const mockResult = {
          summary: {
            totalVulnerabilities: 2,
            highSeverity: 1,
            mediumSeverity: 1,
            lowSeverity: 0,
            overallScore: 75,
            riskLevel: "MEDIUM",
          },
          vulnerabilities: [
            {
              type: "reentrancy-eth",
              severity: "HIGH",
              title: "Reentrancy Vulnerability",
              description: "A mock reentrancy vulnerability was found.",
              recommendation: "Use the checks-effects-interactions pattern.",
            },
            {
              type: "tx-origin",
              severity: "MEDIUM",
              title: "Dangerous use of tx.origin",
              description: "tx.origin is used for authentication.",
              recommendation: "Use msg.sender instead.",
            },
          ],
        };
        await job.setCompleted(mockResult);
        logger.info(`Mock completed analysis job: ${job.id}`);
      }
    }, 15000); // 15 seconds delay
  },
};

/**
 * @description Create a new analysis job
 * @route POST /api/analysis
 */
export const createAnalysis = async (req: Request, res: Response) => {
  const { contractCode, contractName, options } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new AuthenticationError(
      "Authentication required to create analysis.",
    );
  }

  // Find the user to check their limits
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthenticationError("User not found.");
  }

  // Check if user has analysis credits
  if (!user.canAnalyze()) {
    throw new AuthorizationError(
      "Analysis limit reached. Please upgrade your plan.",
    );
  }

  // Create analysis job in the database
  const analysis = await Analysis.create({
    userId,
    contractCode,
    contractName: contractName || "Untitled Contract",
    options: options || {},
    status: "queued",
  });

  // Increment user's usage count
  await user.incrementUsage();

  // MOCK: Add job to the queue
  await analysisService.queueAnalysis(analysis);

  logger.info(`Analysis job created: ${analysis.id} for user ${userId}`);

  res.status(202).json({
    success: true,
    message: "Analysis job accepted.",
    data: {
      jobId: analysis.id,
      status: analysis.status,
      estimatedTime: 30, // seconds
    },
  });
};

/**
 * @description Get the result or status of a specific analysis
 * @route GET /api/analysis/:id
 */
export const getAnalysis = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await Analysis.findByPk(id);

  if (!analysis) {
    throw new NotFoundError("Analysis job not found.");
  }

  // Ensure the user owns this analysis
  if (analysis.userId !== userId) {
    throw new AuthorizationError(
      "You are not authorized to view this analysis.",
    );
  }

  res.status(200).json({
    success: true,
    data: analysis.toJSON(),
  });
};

/**
 * @description Get the status of an analysis job (lightweight)
 * @route GET /api/analysis/:id/status
 */
export const getAnalysisStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await Analysis.findByPk(id, {
    attributes: [
      "id",
      "status",
      "progress",
      "currentStep",
      "createdAt",
      "completedAt",
    ],
  });

  if (!analysis) {
    throw new NotFoundError("Analysis job not found.");
  }

  if (analysis.userId !== userId) {
    throw new AuthorizationError("You are not authorized to view this status.");
  }

  res.status(200).json({
    success: true,
    data: analysis,
  });
};

/**
 * @description Get a paginated list of the user's analysis history
 * @route GET /api/analysis
 */
export const getUserAnalyses = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const { analyses, total } = await Analysis.findByUser(userId!, {
    limit,
    offset,
  });

  res.status(200).json({
    success: true,
    data: analyses.map((a) => a.toSummary()),
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * @description Delete an analysis job
 * @route DELETE /api/analysis/:id
 */
export const deleteAnalysis = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await Analysis.findByPk(id);

  if (!analysis) {
    throw new NotFoundError("Analysis job not found.");
  }

  if (analysis.userId !== userId) {
    throw new AuthorizationError(
      "You are not authorized to delete this analysis.",
    );
  }

  await analysis.destroy();

  logger.info(`Analysis job deleted: ${id} by user ${userId}`);

  res.status(204).send();
};

/**
 * @description Generate a report for an analysis
 * @route POST /api/analysis/:id/report
 */
export const generateReport = async (req: Request, res: Response) => {
  // This is a placeholder for a future feature
  res.status(501).json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Report generation is not yet implemented.",
    },
  });
};
