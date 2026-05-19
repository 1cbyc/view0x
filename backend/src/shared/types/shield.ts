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

/** Active EIP-7702 code delegation on the wallet (Ethereum mainnet). */
export interface ShieldEip7702Delegation {
  hasDelegation: boolean;
  delegate: string | null;
}

export interface ShieldPermit2Approval {
  token: string;
  tokenSymbol: string | null;
  spender: string;
  amount: string;
  expiration: number;
  expiresAt: string | null;
  isUnlimited: boolean;
  spenderRisk: ContractRiskBrief | null;
}

export type ShieldApprovalActivityKind =
  | "erc20_approve"
  | "erc20_revoke"
  | "nft_approve"
  | "nft_revoke"
  | "permit2_approve"
  | "permit2_revoke";

export interface ShieldApprovalActivity {
  kind: ShieldApprovalActivityKind;
  token?: string;
  collection?: string;
  spender?: string;
  operator?: string;
  amount?: string;
  expiration?: number;
  blockNumber: number;
  transactionHash: string;
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
    eip7702Delegations: number;
    permit2Approvals: number;
  };
  scannedAt: string;
}

export interface ShieldScanResult {
  snapshot: ShieldSnapshot;
  approvals: ShieldErc20Approval[];
  nftApprovals: ShieldNftApproval[];
  holdings: ShieldHolding[];
  eip7702: ShieldEip7702Delegation | null;
  permit2Approvals: ShieldPermit2Approval[];
  history: ShieldApprovalActivity[];
}
