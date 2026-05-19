import { fn, col, literal, type OrderItem } from "sequelize";
import { RektIncident } from "../models/RektIncident";
import { rektIncidentsSeed } from "../data/rektIncidentsSeed";
import { logger } from "../utils/logger";
import { fallbackNewsSourceUrls, sanitizeSourceUrls } from "./rektSourceUrls";

const toNumber = (value: string | number | null | undefined): number =>
  value == null ? 0 : Number(value);

const publicAttributes = [
  "id",
  "slug",
  "projectName",
  "title",
  "incidentDate",
  "amountLostUsd",
  "amountRecoveredUsd",
  "severity",
  "status",
  "chains",
  "categories",
  "attackTypes",
  "auditorNames",
  "summary",
  "rootCause",
  "technicalDetails",
  "remediation",
  "affectedAddresses",
  "transactionHashes",
  "sourceUrls",
  "tags",
  "createdAt",
  "updatedAt",
] as const;

export async function seedRektIncidents(): Promise<void> {
  try {
    const count = await RektIncident.count();
    if (count > 0) return;

    for (const incident of rektIncidentsSeed) {
      await RektIncident.findOrCreate({
        where: { slug: incident.slug },
        defaults: {
          ...incident,
          incidentDate: new Date(`${incident.incidentDate}T00:00:00.000Z`),
          affectedAddresses: incident.affectedAddresses || [],
          transactionHashes: incident.transactionHashes || [],
          auditorNames: incident.auditorNames || [],
          sourceUrls: incident.sourceUrls || [],
          tags: incident.tags || [],
        },
      });
    }
    logger.info(`[REKT] Seeded ${rektIncidentsSeed.length} incident records`);
  } catch (error) {
    logger.warn("[REKT] Could not seed incident records:", error);
  }
}

export async function listRektIncidents(params: {
  q?: string;
  chain?: string;
  category?: string;
  attackType?: string;
  auditor?: string;
  severity?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
  sortBy: "amountLostUsd" | "incidentDate" | "projectName";
  sortOrder: "ASC" | "DESC";
}) {
  const where = RektIncident.buildWhere(params);
  const offset = (params.page - 1) * params.limit;
  const order: OrderItem[] =
    params.sortBy === "amountLostUsd"
      ? [literal(`amount_lost_usd ${params.sortOrder} NULLS LAST`) as OrderItem]
      : [[params.sortBy, params.sortOrder]];

  const { count, rows } = await RektIncident.findAndCountAll({
    where,
    attributes: publicAttributes as unknown as string[],
    order,
    limit: params.limit,
    offset,
  });

  return {
    incidents: rows.map((row) => {
      const plain = row.get({ plain: true }) as typeof row & { projectName: string };
      const cleaned = sanitizeSourceUrls(plain.sourceUrls);
      plain.sourceUrls =
        cleaned.length > 0 ? cleaned : fallbackNewsSourceUrls(plain.projectName);
      return plain;
    }),
    pagination: {
      page: params.page,
      limit: params.limit,
      total: count,
      totalPages: Math.ceil(count / params.limit),
      hasNext: params.page * params.limit < count,
      hasPrev: params.page > 1,
    },
  };
}

export async function getRektIncidentBySlug(slug: string) {
  const row = await RektIncident.findOne({
    where: { slug },
    attributes: publicAttributes as unknown as string[],
  });
  if (!row) return null;
  const plain = row.get({ plain: true }) as typeof row & { projectName: string };
  const cleaned = sanitizeSourceUrls(plain.sourceUrls);
  plain.sourceUrls =
    cleaned.length > 0 ? cleaned : fallbackNewsSourceUrls(plain.projectName);
  return plain;
}

export async function getRektStats() {
  const rows = await RektIncident.findAll({
    attributes: [
      [fn("COUNT", col("id")), "incidentCount"],
      [fn("COALESCE", fn("SUM", col("amount_lost_usd")), 0), "totalLostUsd"],
      [fn("COALESCE", fn("SUM", col("amount_recovered_usd")), 0), "totalRecoveredUsd"],
      [fn("MAX", col("amount_lost_usd")), "largestLossUsd"],
    ],
    raw: true,
  });
  const summary = rows[0] as unknown as Record<string, string | number | null> | undefined;
  const yearExpr = literal("EXTRACT(YEAR FROM incident_date)::int");

  const byYear = await RektIncident.findAll({
    attributes: [
      [yearExpr, "year"],
      [fn("COUNT", col("id")), "count"],
      [fn("COALESCE", fn("SUM", col("amount_lost_usd")), 0), "lostUsd"],
    ],
    group: [yearExpr as unknown as string],
    order: [[yearExpr, "ASC"] as OrderItem],
    raw: true,
  });

  const bySeverity = await RektIncident.findAll({
    attributes: [
      "severity",
      [fn("COUNT", col("id")), "count"],
      [fn("COALESCE", fn("SUM", col("amount_lost_usd")), 0), "lostUsd"],
    ],
    group: ["severity"],
    order: [[fn("COUNT", col("id")), "DESC"]],
    raw: true,
  });

  const largest = await RektIncident.findAll({
    attributes: [
      "slug",
      "projectName",
      "title",
      "incidentDate",
      "amountLostUsd",
      "chains",
      "attackTypes",
    ],
    order: [["amountLostUsd", "DESC"]],
    limit: 5,
  });

  return {
    summary: {
      incidentCount: toNumber(summary?.incidentCount),
      totalLostUsd: toNumber(summary?.totalLostUsd),
      totalRecoveredUsd: toNumber(summary?.totalRecoveredUsd),
      largestLossUsd: toNumber(summary?.largestLossUsd),
    },
    byYear: byYear.map((row) => ({
      year: Number((row as any).year),
      count: toNumber((row as any).count),
      lostUsd: toNumber((row as any).lostUsd),
    })),
    bySeverity: bySeverity.map((row) => ({
      severity: (row as any).severity,
      count: toNumber((row as any).count),
      lostUsd: toNumber((row as any).lostUsd),
    })),
    largest,
  };
}

export async function getRektFacets() {
  const incidents = await RektIncident.findAll({
    attributes: ["chains", "categories", "attackTypes", "auditorNames", "severity", "status"],
    raw: true,
  });

  const collect = (field: "chains" | "categories" | "attackTypes" | "auditorNames") => {
    const counts = new Map<string, number>();
    for (const incident of incidents as any[]) {
      for (const value of incident[field] || []) {
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };

  const collectScalar = (field: "severity" | "status") => {
    const counts = new Map<string, number>();
    for (const incident of incidents as any[]) {
      const value = incident[field];
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    }
    return [...counts.entries()].map(([value, count]) => ({ value, count }));
  };

  return {
    chains: collect("chains"),
    categories: collect("categories"),
    attackTypes: collect("attackTypes"),
    auditors: collect("auditorNames"),
    severities: collectScalar("severity"),
    statuses: collectScalar("status"),
  };
}
