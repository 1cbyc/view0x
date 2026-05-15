import type { HeuristicFlag, RiskLevel } from "../../shared/types/addressScan";

const SEVERITY_WEIGHT: Record<HeuristicFlag["severity"], number> = {
  info: 2,
  low: 8,
  medium: 18,
  high: 30,
  critical: 45,
};

export function computeReputationScore(heuristics: HeuristicFlag[]): number {
  const penalty = heuristics.reduce(
    (sum, h) => sum + (SEVERITY_WEIGHT[h.severity] ?? 10),
    0,
  );
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}
