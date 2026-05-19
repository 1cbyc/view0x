import type { JsonRpcProvider, Log } from "ethers";
import { env } from "../../config/environment";

/** Smaller window on public RPC; wider when Alchemy is configured. */
export function shieldLogBlockWindow(): number {
  return env.ALCHEMY_API_KEY ? 120_000 : 25_000;
}

const CHUNK_SIZE = env.ALCHEMY_API_KEY ? 15_000 : 4_000;

function isRangeError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /range|too many|query timeout|block range|exceed|limit/i.test(msg);
}

/**
 * Fetch event logs in block chunks so public RPCs do not reject wide getLogs calls.
 */
export async function getLogsChunked(
  provider: JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
  filter: { topics: (string | string[] | null)[] },
): Promise<Log[]> {
  if (fromBlock > toBlock) return [];

  const out: Log[] = [];

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, toBlock);
    try {
      const chunk = await provider.getLogs({
        fromBlock: start,
        toBlock: end,
        topics: filter.topics,
      });
      out.push(...chunk);
    } catch (err) {
      if (!isRangeError(err) || end - start <= 500) throw err;
      // Retry smaller sub-chunks when the provider rejects the range size.
      for (let sub = start; sub <= end; sub += 500) {
        const subEnd = Math.min(sub + 499, end);
        const subLogs = await provider.getLogs({
          fromBlock: sub,
          toBlock: subEnd,
          topics: filter.topics,
        });
        out.push(...subLogs);
      }
    }
  }

  return out;
}
