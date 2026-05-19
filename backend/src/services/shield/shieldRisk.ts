import type { HeuristicFlag, RiskLevel } from "../../shared/types/addressScan";
import type { ContractRiskBrief, ShieldErc20Approval, ShieldHolding, ShieldNftApproval } from "../../shared/types/shield";
import { getContractRiskBrief } from "../addressScan/addressScanService";

const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function toBrief(
  reputationScore: number,
  riskLevel: RiskLevel,
  heuristics: HeuristicFlag[],
): ContractRiskBrief {
  const topFlags = [...heuristics]
    .sort((a, b) => {
      const sev = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0);
    })
    .slice(0, 5);
  return { reputationScore, riskLevel, topFlags };
}

export async function enrichApprovalRisks(
  chainId: number,
  approvals: ShieldErc20Approval[],
): Promise<ShieldErc20Approval[]> {
  const cache = new Map<string, ContractRiskBrief>();

  async function riskFor(address: string): Promise<ContractRiskBrief | null> {
    const key = address.toLowerCase();
    if (cache.has(key)) return cache.get(key)!;
    try {
      const r = await getContractRiskBrief(chainId, address);
      const brief = toBrief(r.reputationScore, r.riskLevel, r.heuristics);
      cache.set(key, brief);
      return brief;
    } catch {
      return null;
    }
  }

  const out: ShieldErc20Approval[] = [];
  for (const a of approvals) {
    out.push({
      ...a,
      spenderRisk: await riskFor(a.spender),
      tokenRisk: await riskFor(a.token),
    });
  }
  return out;
}

export async function enrichHoldingRisks(
  chainId: number,
  holdings: ShieldHolding[],
): Promise<ShieldHolding[]> {
  const out: ShieldHolding[] = [];
  for (const h of holdings) {
    try {
      const r = await getContractRiskBrief(chainId, h.token);
      out.push({
        ...h,
        tokenRisk: toBrief(r.reputationScore, r.riskLevel, r.heuristics),
      });
    } catch {
      out.push({ ...h, tokenRisk: null });
    }
  }
  return out;
}

export async function enrichNftApprovalRisks(
  chainId: number,
  items: ShieldNftApproval[],
): Promise<ShieldNftApproval[]> {
  const out: ShieldNftApproval[] = [];
  for (const item of items) {
    try {
      const r = await getContractRiskBrief(chainId, item.operator);
      out.push({
        ...item,
        operatorRisk: toBrief(r.reputationScore, r.riskLevel, r.heuristics),
      });
    } catch {
      out.push({ ...item, operatorRisk: null });
    }
  }
  return out;
}

export function isHighRisk(brief: ContractRiskBrief | null): boolean {
  if (!brief) return false;
  return RISK_ORDER[brief.riskLevel] >= RISK_ORDER.HIGH;
}
