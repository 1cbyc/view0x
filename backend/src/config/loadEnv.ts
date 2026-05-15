import path from "path";
import { config } from "dotenv";
import { existsSync } from "fs";

/**
 * Single source of truth: repo-root `.env` (used by Docker Compose and local dev).
 * Falls back to cwd `.env` for tests/CI.
 */
const rootEnv = path.resolve(__dirname, "../../../.env");
const cwdEnv = path.resolve(process.cwd(), ".env");

if (existsSync(rootEnv)) {
  config({ path: rootEnv });
} else if (existsSync(cwdEnv)) {
  config({ path: cwdEnv });
} else {
  config();
}
