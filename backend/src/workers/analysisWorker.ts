import Queue from "bull";
import { Analysis } from "../models/Analysis";
import { logger } from "../utils/logger";
import { env } from "../config/environment";
import { bullQueueClient, bullQueueSubscriber } from "../config/database";
import { analysisService } from "../services/analysisService";
import axios from "axios";

// Python API URL - configurable via environment variable
const PYTHON_API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

// 1. Define the Job Payload Interface
interface AnalysisJobPayload {
  analysisId: string;
  contractCode: string;
  options?: object;
}

// 2. Create the Bull Queue
export const analysisQueue = new Queue<AnalysisJobPayload>("analysis-jobs", {
  createClient: (type) => {
    switch (type) {
      case "client":
        return bullQueueClient;
      case "subscriber":
        return bullQueueSubscriber;
      default:
        // For bclient, Bull creates its own connection.
        // We can return a standard client here if needed, or let Bull handle it.
        return new (require("ioredis"))(bullQueueClient.options);
    }
  },
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // 5 seconds initial delay
    },
    removeOnComplete: true, // Clean up completed jobs
    removeOnFail: false, // Keep failed jobs for inspection
  },
  limiter: {
    max: env.MAX_CONCURRENT_ANALYSES,
    duration: 60000, // 1 minute
  },
});

// 3. Define the Worker Process
const processAnalysisJob = async (job: Queue.Job<AnalysisJobPayload>) => {
  const { analysisId, contractCode, options } = job.data;
  logger.info(`[WORKER] Starting analysis job: ${analysisId}`);

  const analysis = await Analysis.findByPk(analysisId);
  if (!analysis) {
    logger.error(
      `[WORKER] Analysis record not found for job ${analysisId}. Aborting.`,
    );
    throw new Error(`Analysis record ${analysisId} not found.`);
  }

  try {
    // A. Update job status to 'processing'
    await analysis.setStarted();
    job.progress(10);
    logger.info(`[WORKER] Job ${analysisId} status set to processing.`);

    // B. Call the Python analysis service
    const pythonApiUrl = `${PYTHON_API_URL}/analyze`;
    logger.info(
      `[WORKER] Sending analysis request to Python service at ${pythonApiUrl}`,
    );

    const response = await axios.post(pythonApiUrl, {
      job_id: analysisId,
      contract_code: contractCode,
      options: options,
    });

    job.progress(50);

    // C. Poll Redis for the result
    const result = await pollForResult(analysisId);
    job.progress(90);

    // D. Update the analysis record with the result
    await analysis.setCompleted(result);

    // E. Cache the result for future identical requests
    await analysisService.cacheResult(analysis);

    logger.info(
      `[WORKER] ✅ Analysis job ${analysisId} completed successfully.`,
    );
    job.progress(100);

    return { success: true, result };
  } catch (error: any) {
    logger.error(`[WORKER] ❌ Analysis job ${analysisId} failed:`, error);

    if (analysis) {
      await analysis.setFailed(
        error.message || "An unknown error occurred during analysis.",
      );
    }

    // Re-throw the error to let Bull handle the retry logic
    throw error;
  }
};

/**
 * Polls Redis for the result of the analysis.
 * The Python worker is expected to write the result to a specific Redis key.
 */
const pollForResult = async (
  analysisId: string,
  timeout = 60000,
  interval = 2000,
): Promise<object> => {
  const startTime = Date.now();
  const resultKey = `analysis_result:${analysisId}`;

  // Use the main client for polling, not the subscriber
  const redisClient = bullQueueClient;

  while (Date.now() - startTime < timeout) {
    const result = await redisClient.get(resultKey);
    if (result) {
      logger.info(`[WORKER] Result found in Redis for job ${analysisId}`);
      await redisClient.del(resultKey); // Clean up the key
      return JSON.parse(result);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    `Polling for result of job ${analysisId} timed out after ${
      timeout / 1000
    } seconds.`,
  );
};

// 4. Start the Worker
analysisQueue.process("analyze-contract", processAnalysisJob);

// 5. Event Listeners for Logging and Monitoring
analysisQueue.on("active", (job) => {
  logger.info(`[QUEUE] Job ${job.id} (${job.data.analysisId}) has started.`);
});

analysisQueue.on("completed", (job, result) => {
  logger.info(
    `[QUEUE] Job ${job.id} (${job.data.analysisId}) completed successfully.`,
  );
});

analysisQueue.on("failed", (job, error) => {
  logger.error(
    `[QUEUE] Job ${job.id} (${job.data.analysisId}) failed after ${job.attemptsMade} attempts:`,
    error,
  );
});

analysisQueue.on("stalled", (job) => {
  logger.warn(`[QUEUE] Job ${job.id} (${job.data.analysisId}) has stalled.`);
});

logger.info("[WORKER] Analysis worker and queue initialized successfully.");
