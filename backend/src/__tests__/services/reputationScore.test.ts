import { computeReputationScore, scoreToRiskLevel } from "../../services/addressScan/reputationScore";
import type { HeuristicFlag } from "../../shared/types/addressScan";

describe("reputationScore", () => {
  it("returns 100 for no flags", () => {
    expect(computeReputationScore([])).toBe(100);
    expect(scoreToRiskLevel(100)).toBe("LOW");
  });

  it("lowers score with severe flags", () => {
    const flags: HeuristicFlag[] = [
      {
        id: "x",
        category: "trading",
        title: "t",
        description: "d",
        severity: "critical",
      },
    ];
    expect(computeReputationScore(flags)).toBeLessThan(60);
    expect(scoreToRiskLevel(computeReputationScore(flags))).toMatch(
      /HIGH|CRITICAL/,
    );
  });
});
