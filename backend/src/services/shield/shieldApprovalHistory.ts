import { Interface, id, zeroPadValue } from "ethers";
import { normalizeAddress } from "../explorer/addressValidation";
import type { ShieldApprovalActivity } from "../../shared/types/shield";
import { PERMIT2_ADDRESS } from "./shieldPermit2";
import {
  canFallbackToPublicRpc,
  getShieldProvider,
  isAlchemyNetworkError,
} from "./shieldRpc";
import { getLogsChunked, shieldLogBlockWindow } from "./shieldLogScan";

const ERC20_APPROVAL_TOPIC = id("Approval(address,address,uint256)");
const NFT_APPROVAL_FOR_ALL_TOPIC = id("ApprovalForAll(address,address,bool)");
const PERMIT2_APPROVAL_TOPIC = id(
  "Approval(address,address,address,uint160,uint48)",
);

const erc20Iface = new Interface([
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
]);
const nftIface = new Interface([
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
]);
const permit2Iface = new Interface([
  "event Approval(address indexed owner, address indexed token, address indexed spender, uint160 amount, uint48 expiration)",
]);

const HISTORY_LIMIT = 40;

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

export async function fetchApprovalHistory(
  chainId: number,
  ownerInput: string,
): Promise<ShieldApprovalActivity[]> {
  const owner = normalizeAddress(ownerInput);

  return withShieldProvider(chainId, async (provider, mode) => {
    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - blockWindowForMode(mode));
    const ownerTopic = zeroPadValue(owner, 32);
    const activities: ShieldApprovalActivity[] = [];

    const [erc20Logs, nftLogs, permit2Logs] = await Promise.all([
      getLogsChunked(provider, fromBlock, latest, {
        topics: [ERC20_APPROVAL_TOPIC, ownerTopic],
      }).catch(() => []),
      getLogsChunked(provider, fromBlock, latest, {
        topics: [NFT_APPROVAL_FOR_ALL_TOPIC, ownerTopic],
      }).catch(() => []),
      getLogsChunked(provider, fromBlock, latest, {
        address: PERMIT2_ADDRESS,
        topics: [PERMIT2_APPROVAL_TOPIC, ownerTopic],
      }).catch(() => []),
    ]);

    for (const log of erc20Logs) {
      try {
        const parsed = erc20Iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (!parsed) continue;
        const token = normalizeAddress(log.address);
        const spender = normalizeAddress(parsed.args.spender as string);
        const value = BigInt(parsed.args.value);
        activities.push({
          kind: value === 0n ? "erc20_revoke" : "erc20_approve",
          token,
          spender,
          amount: value.toString(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        });
      } catch {
        continue;
      }
    }

    for (const log of nftLogs) {
      try {
        const parsed = nftIface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (!parsed) continue;
        const collection = normalizeAddress(log.address);
        const operator = normalizeAddress(parsed.args.operator as string);
        const approved = Boolean(parsed.args.approved);
        activities.push({
          kind: approved ? "nft_approve" : "nft_revoke",
          collection,
          operator,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        });
      } catch {
        continue;
      }
    }

    for (const log of permit2Logs) {
      try {
        const parsed = permit2Iface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (!parsed) continue;
        const token = normalizeAddress(parsed.args.token as string);
        const spender = normalizeAddress(parsed.args.spender as string);
        const amount = BigInt(parsed.args.amount);
        activities.push({
          kind: amount === 0n ? "permit2_revoke" : "permit2_approve",
          token,
          spender,
          amount: amount.toString(),
          expiration: Number(parsed.args.expiration),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        });
      } catch {
        continue;
      }
    }

    activities.sort((a, b) => b.blockNumber - a.blockNumber);
    return activities.slice(0, HISTORY_LIMIT);
  });
}
