import { getChain, listChains } from "../../config/chains";
import { AddressScan } from "../../models/AddressScan";
import { User } from "../../models/User";
import { Analysis } from "../../models/Analysis";
import type { AddressScanResult, ScanAddressRequest } from "../../shared/types/addressScan";
import { fetchContractFromExplorer } from "../explorer/explorerClient";
import { analysisService } from "../analysisService";
import { runHeuristics } from "./heuristics";
import { computeReputationScore, scoreToRiskLevel } from "./reputationScore";
import { withHeuristicGuidance } from "./heuristicGuidance";
import { logger } from "../../utils/logger";
import crypto from "crypto";

const CACHE_HOURS = 24;

export function getSupportedChains() {
  return listChains().map((c) => ({
    chainId: c.id,
    key: c.key,
    name: c.name,
    nativeSymbol: c.nativeSymbol,
    explorerWebUrl: c.explorerWebUrl,
  }));
}

async function buildScanResult(
  input: ScanAddressRequest,
): Promise<AddressScanResult> {
  const chain = getChain(input.chainId);
  if (!chain) {
    throw new Error(`Unsupported chainId: ${input.chainId}`);
  }

  const explorer = await fetchContractFromExplorer(input.chainId, input.address);
  const contractType = explorer.hasBytecode ? "contract" : "eoa";
  const heuristics = withHeuristicGuidance(
    contractType === "contract" ? runHeuristics(explorer) : [],
  );
  const reputationScore = computeReputationScore(heuristics);
  const riskLevel = scoreToRiskLevel(reputationScore);

  return {
    address: explorer.address,
    chainId: input.chainId,
    chainName: chain.name,
    contractType,
    reputationScore,
    riskLevel,
    heuristics,
    explorer,
    sourceAvailable: Boolean(explorer.sourceCode),
    scannedAt: new Date().toISOString(),
  };
}

async function queueSlitherIfRequested(
  result: AddressScanResult,
  userId: string | undefined,
  runSlither: boolean,
): Promise<string | undefined> {
  if (!runSlither || !result.sourceAvailable || !result.explorer.sourceCode) {
    return undefined;
  }

  if (!userId) {
    throw new Error(
      "Sign in to queue a full Slither analysis for verified contracts.",
    );
  }

  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error("User not found.");
  }
  if (!user.canAnalyze()) {
    throw new Error(
      "You have reached your analysis limit. Upgrade your plan to run Slither.",
    );
  }

  const job = await analysisService.create(userId, {
    contractCode: result.explorer.sourceCode,
    contractName:
      result.explorer.contractName ||
      `Address ${result.address.slice(0, 10)}…`,
    options: {},
  });

  await user.incrementUsage();
  logger.info(
    `[AddressScan] Queued Slither job ${job.id} for ${result.address} (chain ${result.chainId})`,
  );
  return job.id;
}

export async function scanContractAddress(
  input: ScanAddressRequest,
  userId?: string,
  guestSessionId?: string,
): Promise<AddressScanResult & { scanId: string }> {
  const normalizedAddress = input.address.trim().toLowerCase();
  const wantsSlither = Boolean(input.runSlither);

  const cached = await AddressScan.findRecentCached(
    normalizedAddress,
    input.chainId,
    CACHE_HOURS,
  );
  if (cached) {
    if (!userId && guestSessionId && !cached.userId && !cached.guestSessionId) {
      await cached.update({ guestSessionId });
    }
    const payload = ensureGuidance({ ...(cached.result as AddressScanResult) });
    if (wantsSlither && payload.sourceAvailable && !payload.slitherJobId) {
      const slitherJobId = await queueSlitherIfRequested(payload, userId, true);
      const resultWithSlither = { ...payload, slitherJobId };
      const record = await AddressScan.create({
        userId: userId ?? null,
        guestSessionId: userId ? null : guestSessionId ?? null,
        address: payload.address.toLowerCase(),
        chainId: payload.chainId,
        result: resultWithSlither,
        analysisId: slitherJobId ?? null,
      });
      return { ...resultWithSlither, scanId: record.id };
    }
    return { ...payload, scanId: cached.id };
  }

  const result = await buildScanResult(input);
  const slitherJobId = await queueSlitherIfRequested(
    result,
    userId,
    wantsSlither,
  );
  if (slitherJobId) {
    result.slitherJobId = slitherJobId;
  }

  const record = await AddressScan.create({
    userId: userId ?? null,
    guestSessionId: userId ? null : guestSessionId ?? null,
    address: result.address.toLowerCase(),
    chainId: result.chainId,
    result,
    analysisId: slitherJobId ?? null,
  });

  return { ...result, scanId: record.id };
}

/** Apply guidance to heuristic array (cached rows may omit it). */
function ensureGuidance(r: AddressScanResult): AddressScanResult {
  return {
    ...r,
    heuristics: withHeuristicGuidance(r.heuristics),
  };
}

export async function createAddressScanShareToken(
  scanId: string,
  userId: string,
): Promise<{ token: string }> {
  const record = await AddressScan.findByPk(scanId);
  if (!record) {
    throw new Error("Address scan not found");
  }
  if (!record.userId || record.userId !== userId) {
    throw new Error("Only signed-in scanners who ran this scan can create a share link.");
  }

  const token =
    record.shareToken ||
    crypto.randomBytes(24).toString("hex");
  if (!record.shareToken) {
    await record.update({ shareToken: token });
  }
  return { token };
}

export async function getAddressScanByShareToken(
  token: string,
): Promise<AddressScanResult & { scanId: string; analysisStatus?: string }> {
  const row = await AddressScan.findOne({ where: { shareToken: token } });
  if (!row) {
    throw new Error("Shared scan not found or link expired.");
  }

  let analysisStatus: string | undefined;
  let payload = ensureGuidance(row.result as AddressScanResult);
  const analysisId = row.analysisId;
  if (analysisId) {
    const analysis = await Analysis.findByPk(analysisId, {
      attributes: ["status"],
    });
    analysisStatus = analysis?.status;
    payload = { ...payload, slitherJobId: analysisId };
  }

  return {
    ...payload,
    scanId: row.id,
    analysisStatus,
  };
}

export async function getAddressScanById(
  scanId: string,
  userId?: string,
): Promise<AddressScanResult & { scanId: string; analysisStatus?: string }> {
  const record = await AddressScan.findByPk(scanId);
  if (!record) {
    throw new Error("Address scan not found");
  }

  if (userId && record.userId && record.userId !== userId) {
    throw new Error("Not authorized to view this scan");
  }

  let payload = ensureGuidance(record.result as AddressScanResult);
  let analysisStatus: string | undefined;

  if (record.analysisId) {
    const analysis = await Analysis.findByPk(record.analysisId, {
      attributes: ["status", "progress"],
    });
    analysisStatus = analysis?.status;
    if (analysis) {
      payload.slitherJobId = record.analysisId;
    }
  }

  return {
    ...payload,
    scanId: record.id,
    analysisStatus,
  };
}
