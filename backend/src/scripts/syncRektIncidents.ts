import "../config/loadEnv";
import { initializeConnections, sequelize, redis, bullQueueClient, bullQueueSubscriber, cacheRedis } from "../config/database";
import { syncModels } from "../models";
import { importDefiLlamaHacks } from "../services/rektImportService";
import { logger } from "../utils/logger";

function readFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function closeConnections() {
  await Promise.allSettled([
    sequelize.close(),
    redis.quit(),
    bullQueueClient.quit(),
    bullQueueSubscriber.quit(),
    cacheRedis.quit(),
  ]);
}

async function main() {
  const dryRun = readFlag("dry-run");
  const limitValue = readValue("limit");
  const limit = limitValue ? Math.max(1, Number(limitValue)) : undefined;

  if (!dryRun) {
    await initializeConnections();
    await syncModels();
  }

  const result = await importDefiLlamaHacks({ dryRun, limit });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    logger.error("[REKT] Import failed", error);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeConnections();
  });
