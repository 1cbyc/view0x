import { Request, Response } from "express";
import { User } from "../models/User";
import { Analysis } from "../models/Analysis";
import { analysisService } from "../services/analysisService";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { SimpleScanner } from "../services/simpleScanner";

/**
 * @description Public analysis endpoint (no authentication required) - synchronous response
 * @route POST /api/analysis/public
 */
export const publicAnalysis = async (req: Request, res: Response) => {
  try {
    const { contractCode } = req.body;

    if (!contractCode || typeof contractCode !== "string") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Contract code is required",
        },
      });
    }

    // Use SimpleScanner for public analysis (quick sync response)
    const scanner = new SimpleScanner();
    const result = await scanner.analyzeContract(contractCode);

    logger.info(`Public analysis completed - found ${result.vulnerabilities.length} vulnerabilities`);

    res.json({
      success: true,
      message: "Analysis completed",
      data: {
        summary: {
          totalVulnerabilities: result.vulnerabilities.length,
          highSeverity: result.vulnerabilities.filter(v => v.severity === 'HIGH').length,
          mediumSeverity: result.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
          lowSeverity: result.vulnerabilities.filter(v => v.severity === 'LOW').length,
          totalWarnings: result.warnings.length,
          totalSuggestions: result.suggestions.length,
          gasOptimizations: result.gasOptimizations?.length || 0,
          codeQualityIssues: result.codeQuality?.length || 0,
        },
        vulnerabilities: result.vulnerabilities,
        warnings: result.warnings,
        suggestions: result.suggestions,
        gasOptimizations: result.gasOptimizations || [],
        codeQuality: result.codeQuality || [],
      },
    });
  } catch (error: any) {
    logger.error("Public analysis error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Internal server error",
      },
    });
  }
};

/**
 * @description Create a new analysis job by adding it to the queue.
 * @route POST /api/analysis
 */
export const createAnalysis = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  // This should not happen if `auth` middleware is used, but it's a good safeguard.
  if (!userId) {
    throw new AuthenticationError(
      "Authentication is required to perform an analysis.",
    );
  }

  // 1. Check if the user is allowed to perform a new analysis
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthenticationError("User not found.");
  }
  if (!user.canAnalyze()) {
    throw new AuthorizationError(
      "You have reached your analysis limit for this month. Please upgrade your plan.",
    );
  }

  // 2. Pass the request to the AnalysisService
  const analysisJob = await analysisService.create(userId, req.body);

  // 3. Increment the user's usage count
  await user.incrementUsage();

  logger.info(
    `[CONTROLLER] Analysis job created for user ${userId}: ${analysisJob.id}`,
  );

  // 4. Respond to the user immediately with the job ID and status
  res.status(202).json({
    success: true,
    message: "Analysis job has been queued successfully.",
    data: {
      jobId: analysisJob.id,
      status: analysisJob.status,
      estimatedTime: 30, // Provide an estimated time in seconds
    },
  });
};

/**
 * @description Get the result or status of a specific analysis.
 * @route GET /api/analysis/:id
 */
export const getAnalysis = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await analysisService.getById(id);

  // Authorization: Ensure the user owns this analysis
  // The 'as any' is a temporary workaround for type inconsistencies that might arise
  // from different ways the user object is attached.
  if ((analysis as any).userId !== userId) {
    throw new AuthorizationError(
      "You are not authorized to view this analysis.",
    );
  }

  res.status(200).json({
    success: true,
    data: analysis,
  });
};

/**
 * @description Get the lightweight status of an analysis job.
 * @route GET /api/analysis/:id/status
 */
export const getAnalysisStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await Analysis.findByPk(id, {
    attributes: ["id", "status", "progress", "currentStep", "userId"],
  });

  if (!analysis) {
    throw new NotFoundError("Analysis job not found.");
  }

  if (analysis.userId !== userId) {
    throw new AuthorizationError("You are not authorized to view this status.");
  }

  res.status(200).json({
    success: true,
    data: {
      id: analysis.id,
      status: analysis.status,
      progress: analysis.progress,
      currentStep: analysis.currentStep,
    },
  });
};

/**
 * @description Get a paginated list of the user's analysis history.
 * @route GET /api/analysis
 */
export const getUserAnalyses = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const { count, rows } = await Analysis.findAndCountAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  res.status(200).json({
    success: true,
    data: rows.map((a) => a.toSummary()),
    meta: {
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page * limit < count,
        hasPrev: page > 1,
      },
    },
  });
};

/**
 * @description Delete an analysis job.
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
  logger.info(`[CONTROLLER] Analysis job deleted: ${id} by user ${userId}`);

  res.status(204).send(); // No content
};

/**
 * @description Generate a report for an analysis. (Not Implemented)
 * @route POST /api/analysis/:id/report
 */
export const generateReport = async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Report generation is not yet implemented.",
    },
  });
};
