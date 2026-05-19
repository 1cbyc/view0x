import { fn, col } from "sequelize";
import { AddressScan } from "../models/AddressScan";
import { RektIncident } from "../models/RektIncident";
import { rektIncidentsSeed } from "../data/rektIncidentsSeed";
import { scannerCuratedExamples } from "../data/scannerCuratedExamples";
import type { RiskLevel } from "../shared/types/addressScan";
import {
  fallbackNewsSourceUrls,
  isDefillamaHacksUrl,
  sanitizeSourceUrls,
} from "./rektSourceUrls";

export type ScannerDiscoveryItem = {
  id: string;
  kind: "address" | "example" | "rekt";
  title: string;
  subtitle?: string;
  chainId?: number;
  chainName?: string;
  address?: string;
  riskLevel?: RiskLevel | string;
  reputationScore?: number;
  href: string;
  badge?: string;
};

export type ScannerDiscovery = {
  recentThreats: ScannerDiscoveryItem[];
  trending: ScannerDiscoveryItem[];
  mostScanned: ScannerDiscoveryItem[];
  highRiskExamples: ScannerDiscoveryItem[];
  practiceExamples: ScannerDiscoveryItem[];
};

function riskFromScore(score: number): RiskLevel {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MEDIUM";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

async function recentAddressScans(limit: number) {
  return AddressScan.findAll({
    order: [["createdAt", "DESC"]],
    limit: limit * 3,
  });
}

async function mostScannedAddresses(limit: number): Promise<ScannerDiscoveryItem[]> {
  const rows = await AddressScan.findAll({
    attributes: [
      "address",
      "chainId",
      [fn("COUNT", col("AddressScan.id")), "scanCount"],
    ],
    group: ["address", "chainId"],
    order: [[fn("COUNT", col("AddressScan.id")), "DESC"]],
    limit,
    raw: true,
  });

  const items: ScannerDiscoveryItem[] = [];
  type AggregatedScanRow = {
    address: string;
    chainId: number;
    scanCount: string;
  };
  for (const row of rows as unknown as AggregatedScanRow[]) {
    const latest = await AddressScan.findOne({
      where: { address: row.address, chainId: row.chainId },
      order: [["createdAt", "DESC"]],
    });
    if (!latest) continue;
    const result = latest.result;
    items.push({
      id: `scan-${row.address}-${row.chainId}`,
      kind: "address",
      title: result.explorer.contractName || `${row.address.slice(0, 8)}…${row.address.slice(-4)}`,
      subtitle: `${row.scanCount} scans · ${result.chainName}`,
      chainId: row.chainId,
      chainName: result.chainName,
      address: result.address,
      riskLevel: result.riskLevel,
      reputationScore: result.reputationScore,
      href: `/analyze?tab=address&address=${result.address}&chainId=${result.chainId}`,
      badge: "Most scanned",
    });
  }
  return items;
}

function seedRektItems(limit: number): ScannerDiscoveryItem[] {
  return [...rektIncidentsSeed]
    .sort((a, b) => Number(b.amountLostUsd || 0) - Number(a.amountLostUsd || 0))
    .slice(0, limit)
    .map((inc) => ({
      id: `rekt-${inc.slug}`,
      kind: "rekt" as const,
      title: inc.projectName,
      subtitle: inc.summary.slice(0, 120) + (inc.summary.length > 120 ? "…" : ""),
      riskLevel: inc.severity,
      href: `/rekt/${inc.slug}`,
      badge: inc.chains[0],
    }));
}

export async function getScannerDiscovery(): Promise<ScannerDiscovery> {
  const recentRows = await recentAddressScans(12);
  const recentThreats: ScannerDiscoveryItem[] = [];

  for (const row of recentRows) {
    const r = row.result;
    if (r.riskLevel !== "HIGH" && r.riskLevel !== "CRITICAL") continue;
    recentThreats.push({
      id: `recent-${row.id}`,
      kind: "address",
      title: r.explorer.contractName || r.address.slice(0, 12) + "…",
      subtitle: `${r.chainName} · score ${r.reputationScore}`,
      chainId: r.chainId,
      chainName: r.chainName,
      address: r.address,
      riskLevel: r.riskLevel,
      reputationScore: r.reputationScore,
      href: `/analyze?tab=address&address=${r.address}&chainId=${r.chainId}`,
      badge: "Recent threat",
    });
    if (recentThreats.length >= 6) break;
  }

  if (recentThreats.length < 4) {
    const rektRecent = await RektIncident.findAll({
      order: [["incidentDate", "DESC"]],
      limit: 6,
      attributes: ["slug", "projectName", "summary", "severity", "chains", "incidentDate"],
    });
    for (const inc of rektRecent) {
      recentThreats.push({
        id: `rekt-recent-${inc.slug}`,
        kind: "rekt",
        title: inc.projectName,
        subtitle: String(inc.summary).slice(0, 100),
        riskLevel: inc.severity,
        href: `/rekt/${inc.slug}`,
        badge: "Exploit intel",
      });
      if (recentThreats.length >= 8) break;
    }
  }

  const trendingRows = await recentAddressScans(20);
  const trending: ScannerDiscoveryItem[] = trendingRows.slice(0, 8).map((row) => {
    const r = row.result;
    return {
      id: `trend-${row.id}`,
      kind: "address" as const,
      title: r.explorer.contractName || `${r.address.slice(0, 10)}…`,
      subtitle: `${r.chainName} · ${r.riskLevel}`,
      chainId: r.chainId,
      chainName: r.chainName,
      address: r.address,
      riskLevel: r.riskLevel,
      reputationScore: r.reputationScore,
      href: `/analyze?tab=address&address=${r.address}&chainId=${r.chainId}`,
      badge: "Trending",
    };
  });

  let mostScanned = await mostScannedAddresses(6);
  if (mostScanned.length === 0) {
    mostScanned = seedRektItems(6).map((item) => ({ ...item, badge: "Notable exploit" }));
  }

  const highRiskExamples = scannerCuratedExamples
    .filter((e) => e.tier === "high-risk")
    .map((ex) => ({
      id: `hr-${ex.id}`,
      kind: "example" as const,
      title: ex.name,
      subtitle: ex.subtitle,
      href: `/analyze?tab=source&example=${ex.id}`,
      badge: ex.badge,
      riskLevel: "CRITICAL" as RiskLevel,
    }));

  const practiceExamples = scannerCuratedExamples
    .filter((e) => e.tier === "practice")
    .map((ex) => ({
      id: `pr-${ex.id}`,
      kind: "example" as const,
      title: ex.name,
      subtitle: ex.subtitle,
      href: `/analyze?tab=source&example=${ex.id}`,
      badge: ex.badge,
      riskLevel: riskFromScore(85),
    }));

  return {
    recentThreats: recentThreats.slice(0, 8),
    trending: trending.length ? trending : seedRektItems(6),
    mostScanned,
    highRiskExamples,
    practiceExamples,
  };
}

/** One-time style cleanup for rows already stored with defillama.com/hacks. */
export async function sanitizeAllRektDefillamaSources(): Promise<number> {
  const rows = await RektIncident.findAll({ attributes: ["id", "projectName", "sourceUrls"] });
  let updated = 0;

  for (const row of rows) {
    const urls = row.sourceUrls || [];
    if (!urls.some(isDefillamaHacksUrl)) continue;
    const cleaned = sanitizeSourceUrls(urls);
    const next =
      cleaned.length > 0 ? cleaned : fallbackNewsSourceUrls(row.projectName);
    await row.update({ sourceUrls: next });
    updated += 1;
  }

  return updated;
}
