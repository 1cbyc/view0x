export type Severity = "HIGH" | "MEDIUM" | "LOW";

export const normalizeSeverity = (value: unknown): Severity => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "HIGH" || normalized === "CRITICAL") return "HIGH";
  if (normalized === "LOW" || normalized === "INFO" || normalized === "INFORMATIONAL") {
    return "LOW";
  }
  return "MEDIUM";
};

export const getLineNumber = (item: any): number | undefined => {
  return item?.lineNumber ?? item?.location?.line ?? item?.location?.start;
};

export const normalizeLocation = (item: any) => {
  const line = getLineNumber(item);
  return {
    start: item?.location?.start ?? line ?? 0,
    end: item?.location?.end ?? item?.location?.start ?? line ?? 0,
    line,
    column: item?.location?.column ?? 0,
  };
};

export const summarizeFindings = (
  vulnerabilities: Array<{ severity?: string; impact?: string }>,
  gasOptimizations: unknown[],
  codeQuality: unknown[],
  rawSummary?: Record<string, unknown>,
) => {
  const highSeverity =
    (rawSummary?.highSeverity as number | undefined) ??
    vulnerabilities.filter((v) => normalizeSeverity(v.severity || v.impact) === "HIGH").length;
  const mediumSeverity =
    (rawSummary?.mediumSeverity as number | undefined) ??
    vulnerabilities.filter((v) => normalizeSeverity(v.severity || v.impact) === "MEDIUM").length;
  const lowSeverity =
    (rawSummary?.lowSeverity as number | undefined) ??
    vulnerabilities.filter((v) => normalizeSeverity(v.severity || v.impact) === "LOW").length;
  const totalVulnerabilities =
    (rawSummary?.totalVulnerabilities as number | undefined) ?? vulnerabilities.length;

  const overallScore =
    (rawSummary?.overallScore as number | undefined) ??
    Math.max(0, 100 - highSeverity * 20 - mediumSeverity * 5 - lowSeverity);
  const riskLevel =
    (rawSummary?.riskLevel as string | undefined) ??
    (highSeverity > 0 ? "HIGH" : mediumSeverity > 0 ? "MEDIUM" : "LOW");

  return {
    totalVulnerabilities,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    gasOptimizations: (rawSummary?.gasOptimizations as number | undefined) ?? gasOptimizations.length,
    codeQualityIssues: (rawSummary?.codeQualityIssues as number | undefined) ?? codeQuality.length,
    overallScore,
    riskLevel,
  };
};

/** Unwrap Python AnalysisResponse or pass through raw analysis payload. */
export const unwrapPythonAnalysisPayload = (responseBody: any) => {
  if (responseBody?.data && typeof responseBody.data === "object") {
    return responseBody.data;
  }
  return responseBody;
};

export const normalizeAnalysisResult = (
  analysisId: string,
  contractCode: string,
  rawResult: any,
  fallbackTool: string,
) => {
  const rawVulnerabilities = rawResult?.vulnerabilities || [];
  const rawGasOptimizations = rawResult?.gasOptimizations || [];
  const rawCodeQuality = rawResult?.codeQuality || [];

  const vulnerabilities = rawVulnerabilities.map((vuln: any, index: number) => ({
    id: vuln.id || `${fallbackTool}-vulnerability-${index}`,
    type: vuln.type || vuln.check || vuln.title || "unknown",
    title: vuln.title || vuln.type || vuln.check || "Security Finding",
    severity: normalizeSeverity(vuln.severity || vuln.impact),
    description: vuln.description || "",
    location: normalizeLocation(vuln),
    lineNumber: getLineNumber(vuln),
    recommendation:
      vuln.recommendation ||
      "Review the flagged code and apply smart contract security best practices.",
    source: vuln.source || fallbackTool,
    confidence:
      typeof vuln.confidence === "string" ? vuln.confidence.toUpperCase() : vuln.confidence,
    impact: typeof vuln.impact === "string" ? vuln.impact.toUpperCase() : undefined,
    cweId: vuln.cweId,
    functionName: vuln.functionName,
    contractName: vuln.contractName,
  }));

  const gasOptimizations = rawGasOptimizations.map((opt: any, index: number) => ({
    id: opt.id || `${fallbackTool}-gas-${index}`,
    type: opt.type || opt.title || "gas-optimization",
    title: opt.title || opt.type || "Gas Optimization",
    description: opt.description || "",
    location: normalizeLocation(opt),
    lineNumber: getLineNumber(opt),
    potentialSavings: opt.potentialSavings || "Unknown",
    recommendation: opt.recommendation || "Review this code path for possible gas savings.",
    estimatedGasSaved: opt.estimatedGasSaved,
    priority: normalizeSeverity(opt.priority),
    source: opt.source || "gas-optimizer",
  }));

  const codeQuality = rawCodeQuality.map((issue: any, index: number) => ({
    id: issue.id || `${fallbackTool}-quality-${index}`,
    type: issue.type || issue.title || "code-quality",
    title: issue.title || issue.type || "Code Quality Issue",
    severity: normalizeSeverity(issue.severity),
    description: issue.description || "",
    location: normalizeLocation(issue),
    lineNumber: getLineNumber(issue),
    recommendation: issue.recommendation || "Review the flagged code for maintainability.",
    source: issue.source || "code-quality",
  }));

  const metadata = rawResult?.metadata || {};
  return {
    id: rawResult?.id || analysisId,
    success: rawResult?.success !== false,
    summary: summarizeFindings(
      vulnerabilities,
      gasOptimizations,
      codeQuality,
      rawResult?.summary,
    ),
    vulnerabilities,
    warnings: rawResult?.warnings || [],
    suggestions: rawResult?.suggestions || [],
    gasOptimizations,
    codeQuality,
    metadata: {
      analysisTime: metadata.analysisTime ?? metadata.processingTime ?? 0,
      toolsUsed: metadata.toolsUsed || [metadata.tool || fallbackTool],
      contractStats: metadata.contractStats || {
        lines: contractCode.split("\n").length,
        size: contractCode.length,
      },
      timestamp: metadata.timestamp || new Date().toISOString(),
      version: metadata.version || "1.0.0",
      cacheHit: metadata.cacheHit || false,
    },
  };
};
