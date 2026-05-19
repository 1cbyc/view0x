jest.mock("../../services/addressScan/addressScanService", () => ({
  getContractRiskBrief: jest.fn(),
}));

import { isHighRisk } from "../../services/shield/shieldRisk";
import type { ContractRiskBrief } from "../../shared/types/shield";

describe("shieldRisk", () => {
  it("isHighRisk returns true for HIGH and CRITICAL", () => {
    const high: ContractRiskBrief = {
      reputationScore: 40,
      riskLevel: "HIGH",
      topFlags: [],
    };
    const critical: ContractRiskBrief = {
      reputationScore: 10,
      riskLevel: "CRITICAL",
      topFlags: [],
    };
    const low: ContractRiskBrief = {
      reputationScore: 90,
      riskLevel: "LOW",
      topFlags: [],
    };
    expect(isHighRisk(high)).toBe(true);
    expect(isHighRisk(critical)).toBe(true);
    expect(isHighRisk(low)).toBe(false);
    expect(isHighRisk(null)).toBe(false);
  });
});
