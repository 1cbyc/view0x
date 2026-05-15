export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type HeuristicSeverity = "info" | "low" | "medium" | "high" | "critical";

export type ContractType = "contract" | "eoa" | "unknown";

export interface HeuristicFlag {
  id: string;
  category: "ownership" | "trading" | "liquidity" | "proxy" | "code" | "verification";
  title: string;
  description: string;
  severity: HeuristicSeverity;
}

export interface ExplorerContractInfo {
  address: string;
  chainId: number;
  hasBytecode: boolean;
  contractName: string | null;
  isVerified: boolean;
  isProxy: boolean;
  implementationAddress: string | null;
  compilerVersion: string | null;
  sourceCode: string | null;
  abi: string | null;
  explorerUrl: string;
}

export interface AddressScanResult {
  scanId?: string;
  address: string;
  chainId: number;
  chainName: string;
  contractType: ContractType;
  reputationScore: number;
  riskLevel: RiskLevel;
  heuristics: HeuristicFlag[];
  explorer: ExplorerContractInfo;
  sourceAvailable: boolean;
  scannedAt: string;
  slitherJobId?: string;
  analysisStatus?: string;
}

export interface ScanAddressRequest {
  address: string;
  chainId: number;
  runSlither?: boolean;
}
