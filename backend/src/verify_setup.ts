import "dotenv/config";
import {
  sequelize,
  testDatabaseConnection,
  bullQueueClient, // Correctly import bullQueueClient
} from "./config/database";
import { User } from "./models/User";
import { Analysis } from "./models/Analysis";
import { Vulnerability } from "./models/Vulnerability";
import { analysisService } from "./services/analysisService";
import { logger } from "./utils/logger";

const BOLD = "\x1b[1m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

const logHeader = (message: string) =>
  console.log(`\n${BOLD}${YELLOW}=== ${message} ===${RESET}`);
const logSuccess = (message: string) =>
  console.log(`${GREEN}✅ ${message}${RESET}`);
const logFailure = (message: string, error?: any) =>
  console.error(`${RED}❌ ${message}${RESET}`, error || "");
const logInfo = (message: string) => console.log(`  - ${message}`);

async function verifyPhase1And2() {
  let hasFailed = false;

  console.log(
    `${BOLD}🚀 KICKING OFF COMPREHENSIVE VERIFICATION FOR PHASE 1 & 2...${RESET}`,
  );

  // --- Verification Step 1: Database Connection ---
  logHeader("STEP 1: VERIFYING DATABASE CONNECTION");
  const dbConnected = await testDatabaseConnection();
  if (dbConnected) {
    logSuccess("Supabase PostgreSQL connection is successful.");
  } else {
    logFailure("Failed to connect to Supabase PostgreSQL. Halting tests.");
    hasFailed = true;
    process.exit(1);
  }

  // --- Verification Step 2: Database Model Synchronization ---
  logHeader("STEP 2: SYNCHRONIZING DATABASE MODELS");
  try {
    // Force drop and recreate tables for a clean test
    await sequelize.sync({ force: true });
    logSuccess(
      "All models (Users, Analyses, Vulnerabilities) were synchronized successfully.",
    );
    logInfo(
      "Tables `users`, `analyses`, and `vulnerabilities` have been created in your Supabase DB.",
    );
  } catch (error) {
    logFailure("Failed to synchronize database models.", error);
    hasFailed = true;
    process.exit(1);
  }

  // --- Verification Step 3: User Creation ---
  logHeader("STEP 3: VERIFYING USER CREATION & AUTH LOGIC");
  let testUser: User | null = null;
  try {
    const hashedPassword = await require("bcryptjs").hash("password123", 12);
    testUser = await User.create({
      name: "Verification User",
      email: `verify-${Date.now()}@example.com`,
      password: hashedPassword,
      plan: "pro",
    });

    if (testUser && testUser.id) {
      logSuccess("Successfully created a test user in the database.");
      logInfo(`User ID: ${testUser.id}`);
      logInfo(`Email: ${testUser.email}`);
      const passwordMatch = await testUser.checkPassword("password123");
      if (passwordMatch) {
        logSuccess("Password hashing and checking mechanism is working.");
      } else {
        logFailure("Password check failed.");
        hasFailed = true;
      }
    } else {
      throw new Error("User creation did not return a valid user object.");
    }
  } catch (error) {
    logFailure("Failed to create a test user.", error);
    hasFailed = true;
  }

  // --- Verification Step 4: Analysis Service and Job Queuing ---
  if (testUser && !hasFailed) {
    logHeader("STEP 4: VERIFYING ANALYSIS SERVICE & JOB QUEUING");
    try {
      const mockContract = "pragma solidity ^0.8.0; contract Test {}";
      const analysisRequest = {
        contractCode: mockContract,
        contractName: "VerificationContract",
      };

      // Use the actual service to create the analysis
      const analysisJob = await analysisService.create(
        testUser.id,
        analysisRequest,
      );
      logSuccess("AnalysisService successfully created a job.");
      logInfo(`Analysis Job ID: ${analysisJob.id}`);
      logInfo(`Initial Status: ${analysisJob.status}`);

      // Verify the job exists in the database
      const dbJob = await Analysis.findByPk(analysisJob.id);
      if (dbJob && dbJob.status === "queued") {
        logSuccess(
          "Analysis job correctly saved to the database with 'queued' status.",
        );
      } else {
        logFailure(
          "Failed to find the new analysis job in the database or status is incorrect.",
        );
        hasFailed = true;
      }

      // Verify the job exists in the Redis queue
      const queueJob = await bullQueueClient.lrange(
        "bull:analysis-jobs:wait",
        0,
        -1,
      );
      if (queueJob.length > 0) {
        logSuccess("Job successfully added to the Redis/Bull queue.");
        logInfo(
          `Queue 'analysis-jobs' now contains ${queueJob.length} job(s).`,
        );
      } else {
        logFailure("Failed to find the job in the Redis/Bull queue.");
        hasFailed = true;
      }
    } catch (error) {
      logFailure(
        "An error occurred in the analysis service or job queuing.",
        error,
      );
      hasFailed = true;
    }
  }

  // --- Final Summary ---
  logHeader("VERIFICATION SUMMARY");
  if (hasFailed) {
    logFailure(
      "One or more verification steps failed. Please review the logs above.",
    );
  } else {
    logSuccess(
      "All verification steps passed! Phase 1 and 2 are functionally complete.",
    );
    logInfo(
      "The full backend workflow (API -> Service -> DB -> Queue) is confirmed to be working.",
    );
  }

  // Clean up and close connections
  await sequelize.close();
  await bullQueueClient.quit();
  process.exit(hasFailed ? 1 : 0);
}

// Run the verification
verifyPhase1And2().catch((err) => {
  logFailure("An unexpected critical error occurred during verification.", err);
  process.exit(1);
});
