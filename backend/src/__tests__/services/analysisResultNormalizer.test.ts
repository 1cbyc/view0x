import {
  normalizeAnalysisResult,
  normalizeSeverity,
  unwrapPythonAnalysisPayload,
} from "../../services/analysisResultNormalizer";

describe("analysisResultNormalizer", () => {
  const contractCode = "pragma solidity ^0.8.0;\ncontract C { function f() external {} }";

  it("unwraps Python AnalysisResponse envelope", () => {
    const payload = {
      success: true,
      job_id: "job-1",
      message: "Analysis completed successfully",
      data: {
        vulnerabilities: [{ type: "reentrancy", severity: "HIGH", description: "x" }],
        summary: { totalVulnerabilities: 1, highSeverity: 1, mediumSeverity: 0, lowSeverity: 0 },
      },
    };

    const unwrapped = unwrapPythonAnalysisPayload(payload);
    expect(unwrapped.vulnerabilities).toHaveLength(1);
    expect(unwrapped.summary.totalVulnerabilities).toBe(1);
  });

  it("normalizes Python-shaped findings for DB/UI", () => {
    const raw = {
      summary: {
        totalVulnerabilities: 2,
        highSeverity: 1,
        mediumSeverity: 1,
        lowSeverity: 0,
        overallScore: 75,
        riskLevel: "HIGH",
      },
      vulnerabilities: [
        {
          type: "reentrancy-eth",
          severity: "HIGH",
          description: "External call before state update",
          lineNumber: 42,
          recommendation: "Use CEI pattern",
        },
        {
          check: "tx-origin",
          impact: "MEDIUM",
          description: "tx.origin used for auth",
          location: { start: 10, end: 10, line: 10 },
        },
      ],
      gasOptimizations: [
        {
          type: "storage-pack",
          description: "Pack struct slots",
          lineNumber: 5,
        },
      ],
      codeQuality: [],
      metadata: {
        analysisTime: 1200,
        toolsUsed: ["slither", "gas-optimizer", "code-quality"],
        version: "1.0.0",
      },
    };

    const result = normalizeAnalysisResult("analysis-uuid", contractCode, raw, "slither");

    expect(result.id).toBe("analysis-uuid");
    expect(result.summary.highSeverity).toBe(1);
    expect(result.summary.mediumSeverity).toBe(1);
    expect(result.vulnerabilities).toHaveLength(2);
    expect(result.vulnerabilities[0].severity).toBe("HIGH");
    expect(result.vulnerabilities[0].lineNumber).toBe(42);
    expect(result.vulnerabilities[1].severity).toBe("MEDIUM");
    expect(result.gasOptimizations).toHaveLength(1);
    expect(result.metadata.toolsUsed).toEqual(["slither", "gas-optimizer", "code-quality"]);
    expect(result.metadata.contractStats.lines).toBe(2);
  });

  it("maps critical and informational severities", () => {
    expect(normalizeSeverity("CRITICAL")).toBe("HIGH");
    expect(normalizeSeverity("informational")).toBe("LOW");
    expect(normalizeSeverity(undefined)).toBe("MEDIUM");
  });
});
