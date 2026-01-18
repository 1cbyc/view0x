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
import { ReportGenerator, ReportOptions } from "../services/reportGenerator";
import crypto from "crypto";
import { Op } from "sequelize";

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
 * @description Get a paginated list of the user's analysis history with filtering and sorting.
 * @route GET /api/analysis
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 100)
 * @query {string} search - Search term for contract name
 * @query {string} status - Filter by status (queued, processing, completed, failed)
 * @query {string} sortBy - Sort field (createdAt, contractName, status) (default: createdAt)
 * @query {string} sortOrder - Sort order (ASC, DESC) (default: DESC)
 */
export const getUserAnalyses = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;
  const search = req.query.search as string | undefined;
  const status = req.query.status as string | undefined;
  const sortBy = (req.query.sortBy as string) || "createdAt";
  const sortOrder = (req.query.sortOrder as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  // Build where clause
  const where: any = { userId };
  if (status && ["queued", "processing", "completed", "failed"].includes(status)) {
    where.status = status;
  }
  if (search) {
    where.contractName = {
      [Op.iLike]: `%${search}%`,
    };
  }

  // Build order clause
  const validSortFields = ["createdAt", "contractName", "status"];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const order: [string, "ASC" | "DESC"][] = [[orderField, sortOrder]];

  const { count, rows } = await Analysis.findAndCountAll({
    where,
    order,
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
      filters: {
        search: search || null,
        status: status || null,
      },
      sort: {
        by: orderField,
        order: sortOrder,
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
 * @description Generate a report for an analysis.
 * @route POST /api/analysis/:id/report
 */
export const generateReport = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const { format = "json", includeCode = false, includeRecommendations = true, includeMetadata = true } = req.body;

  // Validate format
  if (!["json", "markdown", "pdf"].includes(format)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid format. Supported formats: json, markdown, pdf",
      },
    });
  }

  const analysis = await Analysis.findByPk(id);

  if (!analysis) {
    throw new NotFoundError("Analysis not found.");
  }

  if (analysis.userId !== userId) {
    throw new AuthorizationError("You are not authorized to generate a report for this analysis.");
  }

  if (analysis.status !== "completed") {
    return res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Analysis is not yet completed. Cannot generate report.",
      },
    });
  }

  try {
    const options: ReportOptions = {
      format,
      includeCode,
      includeRecommendations,
      includeMetadata,
    };

    const report = await ReportGenerator.generate(analysis, options);

    // Set appropriate headers
    const contentTypes: Record<string, string> = {
      json: "application/json",
      markdown: "text/markdown",
      pdf: "application/pdf",
    };

    const extensions: Record<string, string> = {
      json: "json",
      markdown: "md",
      pdf: "pdf",
    };

    const contentType = contentTypes[format];
    const extension = extensions[format];

    const filename = `analysis-${id}.${extension}`;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    if (format === "json") {
      res.send(report as string);
    } else if (format === "markdown") {
      res.send(report as string);
    } else {
      // PDF
      res.send(report as Buffer);
    }

    logger.info(`Report generated: ${format} for analysis ${id} by user ${userId}`);
  } catch (error: any) {
    logger.error("Report generation error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate report.",
      },
    });
  }
};

/**
 * @description Generate a share token for an analysis (creates public link)
 * @route POST /api/analysis/:id/share
 */
export const generateShareToken = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await Analysis.findByPk(id);

  if (!analysis) {
    throw new NotFoundError("Analysis not found.");
  }

  if (analysis.userId !== userId) {
    throw new AuthorizationError("You are not authorized to share this analysis.");
  }

  if (analysis.status !== "completed") {
    return res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "Analysis must be completed before sharing.",
      },
    });
  }

  // Generate a unique share token
  const shareToken = crypto.randomBytes(32).toString("hex");
  analysis.shareToken = shareToken;
  analysis.isPublic = true;
  await analysis.save();

  const shareUrl = `${req.protocol}://${req.get("host")}/api/analysis/public/${shareToken}`;

  logger.info(`Share token generated for analysis ${id} by user ${userId}`);

  res.json({
    success: true,
    data: {
      shareToken,
      shareUrl,
      publicUrl: `${req.protocol}://${req.get("host")}/share/${shareToken}`,
    },
  });
};

/**
 * @description Revoke share token (make analysis private again)
 * @route DELETE /api/analysis/:id/share
 */
export const revokeShareToken = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await Analysis.findByPk(id);

  if (!analysis) {
    throw new NotFoundError("Analysis not found.");
  }

  if (analysis.userId !== userId) {
    throw new AuthorizationError("You are not authorized to revoke sharing for this analysis.");
  }

  (analysis.shareToken as any) = null;
  analysis.isPublic = false;
  await analysis.save();

  logger.info(`Share token revoked for analysis ${id} by user ${userId}`);

  res.json({
    success: true,
    message: "Share token revoked successfully.",
  });
};

/**
 * @description Get public analysis by share token (no auth required)
 * @route GET /api/analysis/public/:token
 */
export const getPublicAnalysis = async (req: Request, res: Response) => {
  const { token } = req.params;

  const analysis = await Analysis.findOne({
    where: {
      shareToken: token,
      isPublic: true,
      status: "completed",
    },
  });

  if (!analysis) {
    return res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Shared analysis not found or has been revoked.",
      },
    });
  }

  // Check if analysis has expired
  if (analysis.expiresAt && new Date(analysis.expiresAt) < new Date()) {
    return res.status(404).json({
      success: false,
      error: {
        code: "EXPIRED",
        message: "This shared analysis has expired.",
      },
    });
  }

  res.json({
    success: true,
    data: {
      id: analysis.id,
      contractName: analysis.contractName,
      status: analysis.status,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      result: analysis.result,
      contractInfo: analysis.getContractInfo(),
    },
  });
};

/**
 * @description Toggle favorite status for an analysis
 * @route PATCH /api/analysis/:id/favorite
 */
export const toggleFavorite = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const analysis = await Analysis.findByPk(id);

  if (!analysis) {
    throw new NotFoundError("Analysis not found.");
  }

  if (analysis.userId !== userId) {
    throw new AuthorizationError("You are not authorized to modify this analysis.");
  }

  analysis.isFavorite = !analysis.isFavorite;
  await analysis.save();

  logger.info(`Analysis ${id} favorite status toggled to ${analysis.isFavorite} by user ${userId}`);

  res.json({
    success: true,
    data: {
      id: analysis.id,
      isFavorite: analysis.isFavorite,
    },
  });
};

/**
 * @description Batch analysis - analyze multiple contracts at once
 * @route POST /api/analysis/batch
 */
export const batchAnalysis = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { contracts } = req.body;

  if (!userId) {
    throw new AuthenticationError("Authentication required");
  }

  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
    throw new ValidationError("Contracts array is required");
  }

  if (contracts.length > 10) {
    throw new ValidationError("Maximum 10 contracts per batch");
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new AuthenticationError("User not found");
  }

  // Check usage limit before processing batch
  if (!user.canAnalyze()) {
    throw new ValidationError("Analysis limit reached for your plan");
  }

  const results = [];
  let successCount = 0;
  for (const contractData of contracts) {
    if (!contractData.contractCode) {
      continue;
    }

    // Check usage limit for each contract
    if (!user.canAnalyze()) {
      results.push({
        contractName: contractData.contractName || "Untitled",
        error: "Analysis limit reached",
      });
      continue;
    }

    try {
      const analysisJob = await analysisService.create(userId, contractData);
      await user.incrementUsage();
      successCount++;
      results.push({
        contractName: contractData.contractName || "Untitled",
        jobId: analysisJob.id,
        status: analysisJob.status,
      });
    } catch (error) {
      results.push({
        contractName: contractData.contractName || "Untitled",
        error: (error as Error).message,
      });
    }
  }

  logger.info(`Batch analysis created for user ${userId}: ${results.length} jobs`);

  res.status(202).json({
    success: true,
    message: `Batch analysis queued: ${results.length} contracts`,
    data: results,
  });
};

/**
 * @description Compare two analysis results
 * @route POST /api/analysis/compare
 */
export const compareAnalyses = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { analysisId1, analysisId2 } = req.body;

  if (!userId) {
    throw new AuthenticationError("Authentication required");
  }

  if (!analysisId1 || !analysisId2) {
    throw new ValidationError("Both analysis IDs are required");
  }

  const [analysis1, analysis2] = await Promise.all([
    Analysis.findByPk(analysisId1),
    Analysis.findByPk(analysisId2),
  ]);

  if (!analysis1 || !analysis2) {
    throw new NotFoundError("One or both analyses not found");
  }

  if (analysis1.userId !== userId || analysis2.userId !== userId) {
    throw new AuthorizationError("Not authorized to compare these analyses");
  }

  const result1 = analysis1.result as any;
  const result2 = analysis2.result as any;

  const comparison = {
    analysis1: {
      id: analysis1.id,
      contractName: analysis1.contractName,
      summary: result1?.summary,
      vulnerabilityCount: result1?.vulnerabilities?.length || 0,
    },
    analysis2: {
      id: analysis2.id,
      contractName: analysis2.contractName,
      summary: result2?.summary,
      vulnerabilityCount: result2?.vulnerabilities?.length || 0,
    },
    diff: {
      vulnerabilityDelta: (result1?.vulnerabilities?.length || 0) - (result2?.vulnerabilities?.length || 0),
      highSeverityDelta: (result1?.summary?.highSeverity || 0) - (result2?.summary?.highSeverity || 0),
      scoreDelta: (result1?.summary?.overallScore || 0) - (result2?.summary?.overallScore || 0),
    },
  };

  res.json({
    success: true,
    data: comparison,
  });
};
