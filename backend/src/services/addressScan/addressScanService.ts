import { getChain, listChains } from "../../config/chains";
import type { AddressScanResult, ScanAddressRequest } from "../../shared/types/addressScan";
import { fetchContractFromExplorer } from "../explorer/explorerClient";
import { runHeuristics } from "./heuristics";
import { computeReputationScore, scoreToRiskLevel } from "./reputationScore";

export function getSupportedChains() {
  return listChains().map((c) => ({
    chainId: c.id,
    key: c.key,
    name: c.name,
    nativeSymbol: c.nativeSymbol,
    explorerWebUrl: c.explorerWebUrl,
  }));
}

export async function scanContractAddress(
  input: ScanAddressRequest,
): Promise<AddressScanResult> {
  const chain = getChain(input.chainId);
  if (!chain) {
    throw new Error(`Unsupported chainId: ${input.chainId}`);
  }

  const explorer = await fetchContractFromExplorer(input.chainId, input.address);
  const contractType = explorer.hasBytecode ? "contract" : "eoa";
  const heuristics =
    contractType === "contract" ? runHeuristics(explorer) : [];
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
