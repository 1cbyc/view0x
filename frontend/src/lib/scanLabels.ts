/** Human-readable labels for address-scan heuristics (Token Sniffer style). */

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical risk",
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
  info: "Informational",
};

export const CATEGORY_LABELS: Record<string, string> = {
  verification: "Source verification",
  ownership: "Owner & mint",
  trading: "Trading & honeypot",
  liquidity: "Liquidity",
  proxy: "Proxy / upgrade",
  code: "Dangerous code",
};

export function formatSeverity(severity: string): string {
  return SEVERITY_LABELS[severity] ?? severity;
}

export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
