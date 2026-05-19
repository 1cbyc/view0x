import { getChain } from "../../config/chains";
import type { RiskLevel } from "../../shared/types/addressScan";
import type {
  ShieldErc20Approval,
  ShieldScanResult,
  ShieldSnapshot,
} from "../../shared/types/shield";
import { fetchApprovalHistory } from "./shieldApprovalHistory";
import { fetchEip7702Delegation } from "./shieldEip7702";
import {
  fetchErc20Approvals,
  fetchNftApprovals,
  fetchTokenHoldings,
} from "./shieldIndexer";
import { fetchPermit2Approvals } from "./shieldPermit2";
import {
  enrichApprovalRisks,
  enrichHoldingRisks,
  enrichNftApprovalRisks,
  enrichPermit2ApprovalRisks,
  isHighRisk,
} from "./shieldRisk";
import { cacheRedis } from "../../config/database";
import { normalizeAddress } from "../explorer/addressValidation";

const CACHE_TTL_SEC = 30 * 60;
const SCAN_CACHE_PREFIX = "shield:scan:v4:";

function scoreToHealthLevel(score: number): RiskLevel {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

function computeHealthScore(params: {
  highRiskApprovals: number;
  unlimitedApprovals: number;
  highRiskHoldings: number;
  nftApprovals: number;
  eip7702Delegations: number;
  permit2Approvals: number;
}): number {
  let score = 100;
  score -= params.highRiskApprovals * 15;
  score -= params.unlimitedApprovals * 8;
  score -= params.highRiskHoldings * 10;
  score -= params.nftApprovals * 5;
  score -= params.eip7702Delegations * 20;
  score -= params.permit2Approvals * 10;
  return Math.max(0, Math.min(100, score));
}

/** Single indexed pass — snapshot + approvals (avoids duplicate RPC/log scans). */
export async function runShieldScan(
  chainId: number,
  addressInput: string,
): Promise<ShieldScanResult> {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`Unsupported chainId: ${chainId}`);

  const address = normalizeAddress(addressInput);
  const cacheKey = `${SCAN_CACHE_PREFIX}${chainId}:${address.toLowerCase()}`;
  const cached = await cacheRedis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as ShieldScanResult;
  }

  const rawApprovals = await fetchErc20Approvals(chainId, address);
  const approvals = await enrichApprovalRisks(chainId, rawApprovals);
  const erc20HighRisk = approvals.filter(
    (a) => isHighRisk(a.spenderRisk) || isHighRisk(a.tokenRisk),
  ).length;
  const unlimitedApprovals = approvals.filter((a) => a.isUnlimited).length;

  const rawNft = await fetchNftApprovals(chainId, address);
  const nftEnriched = await enrichNftApprovalRisks(chainId, rawNft);
  const nftApprovals = nftEnriched.length;

  const tokenAddresses = [...new Set(approvals.map((a) => a.token))];
  const rawHoldings = await fetchTokenHoldings(chainId, address, tokenAddresses);
  const holdings = await enrichHoldingRisks(chainId, rawHoldings);
  const highRiskHoldings = holdings.filter((h) => isHighRisk(h.tokenRisk)).length;

  const eip7702 = await fetchEip7702Delegation(chainId, address);
  const eip7702Delegations = eip7702?.hasDelegation ? 1 : 0;

  const rawPermit2 = await fetchPermit2Approvals(chainId, address);
  const permit2Approvals = await enrichPermit2ApprovalRisks(chainId, rawPermit2);
  const highRiskPermit2 = permit2Approvals.filter((a) =>
    isHighRisk(a.spenderRisk),
  ).length;

  const history = await fetchApprovalHistory(chainId, address);

  const highRiskApprovals = erc20HighRisk + highRiskPermit2;

  const healthScore = computeHealthScore({
    highRiskApprovals,
    unlimitedApprovals,
    highRiskHoldings,
    nftApprovals,
    eip7702Delegations,
    permit2Approvals: permit2Approvals.length,
  });

  const snapshot: ShieldSnapshot = {
    address,
    chainId,
    chainName: chain.name,
    healthScore,
    healthLevel: scoreToHealthLevel(healthScore),
    counts: {
      approvals: approvals.length,
      highRiskApprovals,
      holdings: holdings.length,
      highRiskHoldings,
      nftApprovals,
      eip7702Delegations,
      permit2Approvals: permit2Approvals.length,
    },
    scannedAt: new Date().toISOString(),
  };

  const payload: ShieldScanResult = {
    snapshot,
    approvals,
    nftApprovals: nftEnriched,
    holdings,
    eip7702,
    permit2Approvals,
    history,
  };
  await cacheRedis.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(payload));
  return payload;
}

export async function buildShieldSnapshot(
  chainId: number,
  addressInput: string,
): Promise<ShieldSnapshot> {
  const { snapshot } = await runShieldScan(chainId, addressInput);
  return snapshot;
}

export async function getShieldApprovals(
  chainId: number,
  addressInput: string,
): Promise<ShieldErc20Approval[]> {
  const { approvals } = await runShieldScan(chainId, addressInput);
  return approvals;
}

export async function getShieldNftApprovals(chainId: number, addressInput: string) {
  const address = normalizeAddress(addressInput);
  const cacheKey = `shield:nft:${chainId}:${address.toLowerCase()}`;
  const cached = await cacheRedis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const raw = await fetchNftApprovals(chainId, address);
  const enriched = await enrichNftApprovalRisks(chainId, raw);
  await cacheRedis.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(enriched));
  return enriched;
}

export async function getShieldPermit2Approvals(chainId: number, addressInput: string) {
  const { permit2Approvals } = await runShieldScan(chainId, addressInput);
  return permit2Approvals;
}

export async function getShieldApprovalHistory(chainId: number, addressInput: string) {
  const { history } = await runShieldScan(chainId, addressInput);
  return history;
}

export async function getShieldHoldings(chainId: number, addressInput: string) {
  const address = normalizeAddress(addressInput);
  const cacheKey = `shield:holdings:${chainId}:${address.toLowerCase()}`;
  const cached = await cacheRedis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const { approvals } = await runShieldScan(chainId, address);
  const tokens = [...new Set(approvals.map((a) => a.token))];
  const raw = await fetchTokenHoldings(chainId, address, tokens);
  const enriched = await enrichHoldingRisks(chainId, raw);
  await cacheRedis.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(enriched));
  return enriched;
}
