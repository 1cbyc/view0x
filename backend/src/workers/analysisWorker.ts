import Queue from "bull";
import axios from "axios";
import { Analysis } from "../models/Analysis";
import { logger } from "../utils/logger";
import { env } from "../config/environment";
import {
  bullQueueClient,
  bullQueueSubscriber,
  defaultRedis,
} from "../config/database";
import { analysisService } from "../services/analysisService";
import { AnalysisResult } from "../shared/types/analysis";

const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";
const POLLING_TIMEOUT_MS = 120000; // 2 minutes
const POLLING_INTERVAL_MS = 2000; // 2 seconds

interface AnalysisJobPayload {
  analysisId: string;
  contractCode: string;
  options?: object;
}

export const analysisQueue = new Queue<AnalysisJobPayload>("analysis-jobs", {
  createClient: (type) => {
    switch (type) {
      case "client":
        return bullQueueClient;
      case "subscriber":
        return bullQueueSubscriber;
      default:
        return new (require("ioredis"))(bullQueueClient.options);
    }
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
  limiter: {
    max: env.MAX_CONCURRENT_ANALYSES,
    duration: 60000,
  },
});

/**
 * Initiates the analysis by calling the Python worker.
 * @param analysisId - The ID of the analysis job.
 * @param contractCode - The contract code to analyze.
 * @param options - Analysis options.
 */
async function initiatePythonAnalysis(
  analysisId: string,
  contractCode: string,
  options?: object,
): Promise<void> {
  const url = `${PYTHON_API_URL}/analyze`;
  logger.info(
    `[WORKER] Sending analysis request to Python service for job ${analysisId}`,
    { url },
  );

  await axios.post(url, {
    job_id: analysisId,
    contract_code: contractCode,
    options: options,
  });
}

/**
 * Polls Redis for the result of the analysis from the Python worker.
 * @param analysisId - The ID of the analysis job.
 * @returns The analysis result.
 */
async function awaitAnalysisResult(
  analysisId: string,
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const resultKey = `analysis_result:${analysisId}`;
  logger.info(`[WORKER] Polling Redis for result of job ${analysisId}`, {
    key: resultKey,
  });

  while (Date.now() - startTime < POLLING_TIMEOUT_MS) {
    const resultJson = await defaultRedis.get(resultKey);
    if (resultJson) {
      logger.info(`[WORKER] Result found in Redis for job ${analysisId}`);
      await defaultRedis.del(resultKey); // Clean up the key after reading
      try {
        return JSON.parse(resultJson) as AnalysisResult;
      } catch (error) {
        throw new Error(
          `Failed to parse analysis result for job ${analysisId}`,
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
  }

  throw new Error(
    `Polling for result of job ${analysisId} timed out after ${POLLING_TIMEOUT_MS / 1000} seconds.`,
  );
}

/**
 * Processes a single analysis job from the queue.
 * @param job - The Bull job object.
 */
const processAnalysisJob = async (job: Queue.Job<AnalysisJobPayload>) => {
  const { analysisId, contractCode, options } = job.data;
  logger.info(`[WORKER] Starting analysis job: ${analysisId}`);

  const analysis = await Analysis.findByPk(analysisId);
  if (!analysis) {
    throw new Error(
      `[WORKER] Analysis record ${analysisId} not found in database. Aborting.`,
    );
  }

  try {
    // 1. Update status to 'processing' in the database
    await analysis.setStarted();
    await job.progress(10);

    // 2. Trigger the asynchronous Python analysis service
    await initiatePythonAnalysis(analysisId, contractCode, options);
    await job.progress(30);

    // 3. Poll Redis for the result from the Python worker
    const result = await awaitAnalysisResult(analysisId);
    await job.progress(90);

    // 4. Save the final result to the PostgreSQL database
    await analysis.setCompleted(result);
    logger.info(`[WORKER] Result for job ${analysisId} saved to database.`);

    // 5. Cache the result in Redis for future identical requests
    await analysisService.cacheResult(analysis);

    await job.progress(100);
    logger.info(
      `[WORKER] ✅ Analysis job ${analysisId} completed successfully.`,
    );

    return { success: true, analysisId };
  } catch (error: any) {
    logger.error(`[WORKER] ❌ Analysis job ${analysisId} failed:`, {
      message: error.message,
    });

    // Update the database record to reflect the failure
    if (analysis) {
      await analysis.setFailed(
        error.message || "An unknown error occurred during analysis.",
      );
    }

    // Re-throw the error to allow Bull to handle retries
    throw error;
  }
};

// Start processing jobs from the queue
analysisQueue.process("analyze-contract", processAnalysisJob);

// Event listeners for queue monitoring
analysisQueue.on("active", (job) => {
  logger.info(`[QUEUE] Job ${job.id} (${job.data.analysisId}) has started.`);
});

analysisQueue.on("completed", (job) => {
  logger.info(
    `[QUEUE] Job ${job.id} (${job.data.analysisId}) completed successfully.`,
  );
});

analysisQueue.on("failed", (job, error) => {
  logger.error(
    `[QUEUE] Job ${job.id} (${job.data.analysisId}) failed after ${job.attemptsMade} attempts:`,
    { message: error.message },
  );
});

analysisQueue.on("stalled", (job) => {
  logger.warn(`[QUEUE] Job ${job.id} (${job.data.analysisId}) has stalled.`);
});

logger.info("[WORKER] Analysis worker and queue initialized successfully.");
