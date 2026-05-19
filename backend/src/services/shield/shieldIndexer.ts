import { Contract, id, zeroPadValue } from "ethers";
import { getChain } from "../../config/chains";
import { normalizeAddress } from "../explorer/addressValidation";
import type { ShieldErc20Approval, ShieldHolding, ShieldNftApproval } from "../../shared/types/shield";
import { getIndexerNote, getShieldProvider } from "./shieldRpc";
import { getLogsChunked, shieldLogBlockWindow } from "./shieldLogScan";

const APPROVAL_TOPIC = id("Approval(address,address,uint256)");
const APPROVAL_FOR_ALL_TOPIC = id("ApprovalForAll(address,address,bool)");

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export async function fetchErc20Approvals(
  chainId: number,
  ownerInput: string,
): Promise<ShieldErc20Approval[]> {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);

  const owner = normalizeAddress(ownerInput);
  const provider = getShieldProvider(chainId);
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - shieldLogBlockWindow());

  const ownerTopic = zeroPadValue(owner, 32);

  const logs = await getLogsChunked(provider, fromBlock, latest, {
    topics: [APPROVAL_TOPIC, ownerTopic],
  });

  const latestByKey = new Map<string, { token: string; spender: string; value: bigint }>();

  for (const log of logs) {
    if (log.topics.length < 3) continue;
    const token = normalizeAddress(log.address);
    const spender = normalizeAddress(`0x${log.topics[2].slice(26)}`);
    const value = BigInt(log.data);
    const key = `${token}:${spender}`;
    latestByKey.set(key, { token, spender, value });
  }

  const active: ShieldErc20Approval[] = [];

  for (const { token, spender, value } of latestByKey.values()) {
    if (value === 0n) continue;

    let allowance = value;
    try {
      const c = new Contract(token, ERC20_ABI, provider);
      allowance = await c.allowance(owner, spender);
    } catch {
      // keep log value
    }

    if (allowance === 0n) continue;

    const maxUint = 2n ** 256n - 1n;
    const isUnlimited = allowance > maxUint / 2n;

    let tokenSymbol: string | null = null;
    try {
      const c = new Contract(token, ERC20_ABI, provider);
      tokenSymbol = await c.symbol();
    } catch {
      tokenSymbol = null;
    }

    active.push({
      token,
      tokenSymbol,
      spender,
      allowance: allowance.toString(),
      isUnlimited,
      spenderRisk: null,
      tokenRisk: null,
    });
  }

  return active;
}

export async function fetchNftApprovals(
  chainId: number,
  ownerInput: string,
): Promise<ShieldNftApproval[]> {
  const owner = normalizeAddress(ownerInput);
  const provider = getShieldProvider(chainId);
  const latest = await provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - shieldLogBlockWindow());
  const ownerTopic = zeroPadValue(owner, 32);

  const logs = await getLogsChunked(provider, fromBlock, latest, {
    topics: [APPROVAL_FOR_ALL_TOPIC, ownerTopic],
  });

  const byKey = new Map<string, ShieldNftApproval>();

  for (const log of logs) {
    if (log.topics.length < 3) continue;
    const collection = normalizeAddress(log.address);
    const operator = normalizeAddress(`0x${log.topics[2].slice(26)}`);
    const approved = BigInt(log.data) !== 0n;
    const key = `${collection}:${operator}`;
    byKey.set(key, {
      collection,
      operator,
      approved,
      standard: "erc721",
      operatorRisk: null,
    });
  }

  return [...byKey.values()].filter((a) => a.approved);
}

export async function fetchTokenHoldings(
  chainId: number,
  ownerInput: string,
  knownTokens: string[],
): Promise<ShieldHolding[]> {
  const owner = normalizeAddress(ownerInput);
  const provider = getShieldProvider(chainId);
  const unique = [...new Set(knownTokens.map((t) => normalizeAddress(t)))];

  const holdings: ShieldHolding[] = [];

  for (const token of unique) {
    try {
      const c = new Contract(token, ERC20_ABI, provider);
      const balance: bigint = await c.balanceOf(owner);
      if (balance === 0n) continue;
      let tokenSymbol: string | null = null;
      try {
        tokenSymbol = await c.symbol();
      } catch {
        tokenSymbol = null;
      }
      holdings.push({
        token,
        tokenSymbol,
        balance: balance.toString(),
        tokenRisk: null,
      });
    } catch {
      // skip invalid token
    }
  }

  return holdings;
}

export { getIndexerNote };
