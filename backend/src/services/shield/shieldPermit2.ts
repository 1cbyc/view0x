import { Contract, Interface, id, zeroPadValue } from "ethers";
import { normalizeAddress } from "../explorer/addressValidation";
import type { ShieldPermit2Approval } from "../../shared/types/shield";
import {
  canFallbackToPublicRpc,
  getShieldProvider,
  isAlchemyNetworkError,
} from "./shieldRpc";
import { getLogsChunked, shieldLogBlockWindow } from "./shieldLogScan";

/** Uniswap Permit2 — same address on supported EVM chains. */
export const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA9";

const PERMIT2_APPROVAL_TOPIC = id(
  "Approval(address,address,address,uint160,uint48)",
);

const permit2Iface = new Interface([
  "event Approval(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration)",
  "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
]);

const ERC20_ABI = ["function symbol() view returns (string)"];

async function withShieldProvider<T>(
  chainId: number,
  task: (
    provider: ReturnType<typeof getShieldProvider>,
    mode: "alchemy" | "public",
  ) => Promise<T>,
): Promise<T> {
  try {
    return await task(getShieldProvider(chainId, true), "alchemy");
  } catch (err) {
    if (!canFallbackToPublicRpc(chainId) || !isAlchemyNetworkError(err)) {
      throw err;
    }
    return task(getShieldProvider(chainId, false), "public");
  }
}

function blockWindowForMode(mode: "alchemy" | "public"): number {
  return mode === "alchemy" ? shieldLogBlockWindow() : 25_000;
}

function isAllowanceActive(amount: bigint, expiration: number, nowSec: number): boolean {
  if (amount === 0n) return false;
  if (expiration > 0 && expiration < nowSec) return false;
  return true;
}

export async function fetchPermit2Approvals(
  chainId: number,
  ownerInput: string,
): Promise<ShieldPermit2Approval[]> {
  const owner = normalizeAddress(ownerInput);

  return withShieldProvider(chainId, async (provider, mode) => {
    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - blockWindowForMode(mode));
    const ownerTopic = zeroPadValue(owner, 32);
    const nowSec = Math.floor(Date.now() / 1000);

    let logs;
    try {
      logs = await getLogsChunked(provider, fromBlock, latest, {
        address: PERMIT2_ADDRESS,
        topics: [PERMIT2_APPROVAL_TOPIC, ownerTopic],
      });
    } catch {
      return [];
    }

    const latestByKey = new Map<
      string,
      { token: string; spender: string; amount: bigint; expiration: number }
    >();

    for (const log of logs) {
      try {
        const parsed = permit2Iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (!parsed) continue;
        const token = normalizeAddress(parsed.args.token as string);
        const spender = normalizeAddress(parsed.args.spender as string);
        const amount = BigInt(parsed.args.amount);
        const expiration = Number(parsed.args.expiration);
        latestByKey.set(`${token}:${spender}`, { token, spender, amount, expiration });
      } catch {
        continue;
      }
    }

    const permit2 = new Contract(PERMIT2_ADDRESS, permit2Iface, provider);
    const active: ShieldPermit2Approval[] = [];

    for (const { token, spender, amount, expiration } of latestByKey.values()) {
      let liveAmount = amount;
      let liveExpiration = expiration;
      try {
        const live = await permit2.allowance(owner, token, spender);
        liveAmount = BigInt(live.amount);
        liveExpiration = Number(live.expiration);
      } catch {
        // keep log values
      }

      if (!isAllowanceActive(liveAmount, liveExpiration, nowSec)) continue;

      let tokenSymbol: string | null = null;
      try {
        const c = new Contract(token, ERC20_ABI, provider);
        tokenSymbol = await c.symbol();
      } catch {
        tokenSymbol = null;
      }

      const maxUint = 2n ** 160n - 1n;
      active.push({
        token,
        tokenSymbol,
        spender,
        amount: liveAmount.toString(),
        expiration: liveExpiration,
        expiresAt:
          liveExpiration > 0
            ? new Date(liveExpiration * 1000).toISOString()
            : null,
        isUnlimited: liveAmount > maxUint / 2n,
        spenderRisk: null,
      });
    }

    return active;
  });
}
