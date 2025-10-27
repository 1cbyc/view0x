import Queue from "bull";
import axios from "axios";
import { Analysis } from "../models/Analysis";
import { logger } from "../utils/logger";
import { env } from "../config/environment";
import { bullQueueClient, bullQueueSubscriber } from "../config/database";
import { analysisService } from "../services/analysisService";
import { emitAnalysisUpdate } from "../events/appEvents";

// Define the Job Payload Interface
interface AnalysisJobPayload {
  analysisId: string;
  contractCode: string;
  options?: object;
}

// Create the Bull Queue
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
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
  limiter: {
    max: env.MAX_CONCURRENT_ANALYSES,
    duration: 60000,
  },
});

// Define the Worker Process
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
    // 1. Update status to 'processing' and emit event
    await analysis.setStarted();
    emitAnalysisUpdate({
      analysisId,
      status: "processing",
      progress: 10,
      currentStep: "Initializing analysis...",
    });

    // 2. Call the Python analysis service
    const pythonApiUrl = "http://localhost:8000/analyze"; // Should be in .env
    logger.info(
      `[WORKER] Sending analysis request to Python service for job ${analysisId}`,
    );

    // Emit event to notify that the heavy lifting has started
    emitAnalysisUpdate({
      analysisId,
      status: "processing",
      progress: 30,
      currentStep: "Scanning contract with Slither...",
    });

    const response = await axios.post(
      pythonApiUrl,
      {
        job_id: analysisId,
        contract_code: contractCode,
        options: options,
      },
      { timeout: env.SLITHER_TIMEOUT * 1000 }, // Add timeout
    );

    const result = response.data;

    // 3. Update the analysis record with the result
    await analysis.setCompleted(result);
    logger.info(`[WORKER] Result for job ${analysisId} saved to database.`);

    // 4. Cache the result for future identical requests
    await analysisService.cacheResult(analysis);

    // 5. Emit completion event
    emitAnalysisUpdate({
      analysisId,
      status: "completed",
      progress: 100,
      currentStep: "Analysis complete",
      result,
    });

    logger.info(
      `[WORKER] ✅ Analysis job ${analysisId} completed successfully.`,
    );
    return { success: true, result };
  } catch (error: any) {
    logger.error(`[WORKER] ❌ Analysis job ${analysisId} failed:`, error);

    const errorMessage =
      error.response?.data?.detail ||
      error.message ||
      "An unknown error occurred during analysis.";

    if (analysis) {
      await analysis.setFailed(errorMessage);
    }

    // Emit failure event
    emitAnalysisUpdate({
      analysisId,
      status: "failed",
      progress: 0,
      error: errorMessage,
    });

    // Re-throw the error to let Bull handle the retry logic
    throw new Error(errorMessage);
  }
};

// Start the Worker
analysisQueue.process("analyze-contract", processAnalysisJob);

// Event Listeners for Logging and Monitoring
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
    `[QUEUE] Job ${job.id} (${job.data.analysisId}) failed after ${job.attemptsMade} attempts: ${error.message}`,
  );
});

analysisQueue.on("stalled", (job) => {
  logger.warn(`[QUEUE] Job ${job.id} (${job.data.analysisId}) has stalled.`);
});

logger.info("[WORKER] Analysis worker and queue initialized successfully.");
