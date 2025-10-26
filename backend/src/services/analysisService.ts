import { Analysis } from "../models/Analysis";
import { User } from "../models/User";
import { analysisQueue } from "../workers/analysisWorker";
import { logger } from "../utils/logger";
import { NotFoundError } from "../middleware/errorHandler";
import { cacheRedis } from "../config/database";
import { env } from "../config/environment";
import { CreateAnalysisRequest } from "../shared/types/api";
import { AnalysisJob } from "../shared/types/analysis";

const ANALYSIS_CACHE_TTL = env.REDIS_TTL; // Time to live for cached results in seconds

export class AnalysisService {
  /**
   * Creates a new analysis job, adds it to the queue, and returns the job details.
   * @param userId - The ID of the user requesting the analysis.
   * @param analysisData - The contract code and options for the analysis.
   * @returns The created analysis job object.
   */
  public async create(
    userId: string,
    analysisData: CreateAnalysisRequest,
  ): Promise<AnalysisJob> {
    const { contractCode, contractName, options } = analysisData;

    const cacheKey = this.generateCacheKey(contractCode, options);
    const cachedResult = await this.getCachedResult(cacheKey);

    if (cachedResult) {
      logger.info(`[AnalysisService] Cache hit for analysis: ${cacheKey}`);
      const analysis = await Analysis.create({
        userId,
        contractCode,
        contractName: contractName || "Untitled Contract (Cached)",
        options: options || {},
        status: "completed",
        result: cachedResult,
        cacheHit: true,
        completedAt: new Date(),
        processingTimeMs: 0,
      });
      return this.toAnalysisJob(analysis);
    }

    logger.info(`[AnalysisService] Cache miss for analysis: ${cacheKey}`);

    const analysis = await Analysis.create({
      userId,
      contractCode,
      contractName: contractName || "Untitled Contract",
      options: options || {},
      status: "queued",
    });

    await analysisQueue.add("analyze-contract", {
      analysisId: analysis.id,
      contractCode,
      options,
    });

    logger.info(`[AnalysisService] Analysis job ${analysis.id} queued.`);

    return this.toAnalysisJob(analysis);
  }

  /**
   * Retrieves an analysis job by its ID.
   * @param analysisId - The ID of the analysis job.
   * @returns The analysis job object.
   */
  public async getById(analysisId: string): Promise<AnalysisJob> {
    const analysis = await Analysis.findByPk(analysisId, {
      include: [{ model: User, as: "user", attributes: ["id", "name"] }],
    });

    if (!analysis) {
      throw new NotFoundError("Analysis job not found.");
    }

    return this.toAnalysisJob(analysis);
  }

  /**
   * Caches the result of a completed analysis.
   * @param analysis - The completed analysis instance.
   */
  public async cacheResult(analysis: Analysis): Promise<void> {
    if (analysis.status !== "completed" || !analysis.result) {
      return;
    }

    const cacheKey = this.generateCacheKey(
      analysis.contractCode,
      analysis.options,
    );
    try {
      await cacheRedis.set(
        cacheKey,
        JSON.stringify(analysis.result),
        "EX",
        ANALYSIS_CACHE_TTL,
      );
      logger.info(
        `[AnalysisService] Result cached for analysis: ${analysis.id}`,
      );
    } catch (error) {
      logger.error(
        `[AnalysisService] Failed to cache result for analysis ${analysis.id}:`,
        error,
      );
    }
  }

  /**
   * Converts a Sequelize Analysis model instance to a plain AnalysisJob object.
   * This function ensures type compatibility between the model and the shared interface.
   * @param analysis - The Sequelize model instance.
   * @returns A plain object matching the AnalysisJob interface.
   */
  private toAnalysisJob(analysis: Analysis): AnalysisJob {
    return {
      id: analysis.id,
      userId: analysis.userId,
      status: analysis.status,
      progress: analysis.progress,
      currentStep: analysis.currentStep,
      contractInfo: analysis.getContractInfo(),
      options: analysis.options,
      result: analysis.result,
      error: analysis.errorMessage,
      estimatedTime: analysis.estimatedTime,
      createdAt: analysis.createdAt.toISOString(),
      startedAt: analysis.startedAt
        ? analysis.startedAt.toISOString()
        : undefined,
      completedAt: analysis.completedAt
        ? analysis.completedAt.toISOString()
        : undefined,
    };
  }

  /**
   * Generates a unique cache key based on contract code and options.
   * @param contractCode - The Solidity contract code.
   * @param options - The analysis options.
   * @returns A unique SHA256 hash string.
   */
  private generateCacheKey(contractCode: string, options?: object): string {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(contractCode);
    if (options) {
      hash.update(JSON.stringify(options));
    }
    return `analysis:${hash.digest("hex")}`;
  }

  /**
   * Retrieves a cached analysis result from Redis.
   * @param cacheKey - The unique key for the cached result.
   * @returns The parsed result object or null if not found.
   */
  private async getCachedResult(cacheKey: string): Promise<object | null> {
    try {
      const cachedData = await cacheRedis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      logger.error(
        `[AnalysisService] Failed to retrieve cached result for key ${cacheKey}:`,
        error,
      );
      return null;
    }
  }
}

export const analysisService = new AnalysisService();
