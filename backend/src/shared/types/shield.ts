import type { HeuristicFlag, RiskLevel } from "./addressScan";

export interface ContractRiskBrief {
  reputationScore: number;
  riskLevel: RiskLevel;
  topFlags: HeuristicFlag[];
}

export interface ShieldErc20Approval {
  token: string;
  tokenSymbol: string | null;
  spender: string;
  allowance: string;
  isUnlimited: boolean;
  spenderRisk: ContractRiskBrief | null;
  tokenRisk: ContractRiskBrief | null;
}

export interface ShieldNftApproval {
  collection: string;
  operator: string;
  approved: boolean;
  standard: "erc721" | "erc1155";
  operatorRisk: ContractRiskBrief | null;
}

export interface ShieldHolding {
  token: string;
  tokenSymbol: string | null;
  balance: string;
  tokenRisk: ContractRiskBrief | null;
}

export interface ShieldSnapshot {
  address: string;
  chainId: number;
  chainName: string;
  healthScore: number;
  healthLevel: RiskLevel;
  counts: {
    approvals: number;
    highRiskApprovals: number;
    holdings: number;
    highRiskHoldings: number;
    nftApprovals: number;
  };
  scannedAt: string;
}

export interface ShieldScanResult {
  snapshot: ShieldSnapshot;
  approvals: ShieldErc20Approval[];
  nftApprovals: ShieldNftApproval[];
  holdings: ShieldHolding[];
}
