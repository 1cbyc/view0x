import axios from "axios";
import { Op } from "sequelize";
import {
  RektIncident,
  type RektIncidentSeverity,
  type RektIncidentStatus,
} from "../models/RektIncident";
import { logger } from "../utils/logger";
import { resolveHackSourceUrls, sanitizeSourceUrls } from "./rektSourceUrls";
import {
  buildRektIncidentSlug,
  stripDefillamaSlugPrefix,
  toLegacyDefillamaSlug,
} from "./rektSlug";

type DefiLlamaHack = {
  date: number;
  name: string;
  classification?: string | null;
  technique?: string | null;
  amount?: number | null;
  chain?: string[] | null;
  bridgeHack?: boolean | null;
  targetType?: string | null;
  source?: string | null;
  returnedFunds?: number | null;
  defillamaId?: number | null;
  language?: string | null;
};

export type RektImportResult = {
  source: string;
  fetched: number;
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
};

const DEFAULT_DEFILLAMA_HACKS_URL =
  process.env.REKT_DEFILLAMA_HACKS_URL || "https://api.llama.fi/hacks";

function compact(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function toDateOnly(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
}

function severityForLoss(amount: number): RektIncidentSeverity {
  if (amount >= 10_000_000) return "CRITICAL";
  if (amount >= 1_000_000) return "HIGH";
  if (amount >= 100_000) return "MEDIUM";
  return "LOW";
}

function statusForRecovery(amount: number, returnedFunds?: number | null): RektIncidentStatus {
  const returned = Number(returnedFunds || 0);
  if (amount > 0 && returned >= amount) return "recovered";
  if (returned > 0) return "partial_recovery";
  return "confirmed";
}

function sourceUrlsForHack(hack: DefiLlamaHack): string[] {
  return resolveHackSourceUrls(hack.source, hack.name);
}

function normalizeDefiLlamaHack(hack: DefiLlamaHack) {
  const amount = Number(hack.amount || 0);
  const returnedFunds = Number(hack.returnedFunds || 0);
  const incidentDate = toDateOnly(hack.date);
  const chains = compact(hack.chain || []);
  const categories = compact([
    hack.targetType || undefined,
    hack.bridgeHack ? "Bridge" : undefined,
    hack.classification || undefined,
  ]);
  const attackTypes = compact([
    hack.technique || undefined,
    hack.classification || undefined,
    hack.language ? `${hack.language} exploit` : undefined,
  ]);
  const projectName = hack.name.trim();
  const title = `${projectName} ${hack.technique || hack.classification || "incident"}`;
  const slug = buildRektIncidentSlug(
    projectName,
    incidentDate,
    hack.technique || hack.classification || "hack",
  );

  return {
    slug,
    projectName,
    title: title.slice(0, 220),
    incidentDate: new Date(`${incidentDate}T00:00:00.000Z`),
    amountLostUsd: amount ? amount.toFixed(2) : null,
    amountRecoveredUsd: returnedFunds ? returnedFunds.toFixed(2) : null,
    severity: severityForLoss(amount),
    status: statusForRecovery(amount, returnedFunds),
    chains,
    categories,
    attackTypes,
    auditorNames: [],
    summary: `${projectName} lost ${amount ? `$${amount.toLocaleString("en-US")}` : "funds"} in a ${hack.technique || hack.classification || "reported exploit"}${chains.length ? ` on ${chains.join(", ")}` : ""}.`,
    rootCause: hack.classification || hack.technique
      ? `${compact([hack.classification || undefined, hack.technique || undefined]).join(": ")}.`
      : null,
    technicalDetails: null,
    remediation: "Review privileged paths, external calls, price assumptions, accounting invariants, and emergency response controls for similar failure modes.",
    affectedAddresses: [],
    transactionHashes: [],
    sourceUrls: sourceUrlsForHack(hack),
    tags: compact([
      hack.classification || undefined,
      hack.technique || undefined,
      hack.targetType || undefined,
      hack.language || undefined,
    ]),
  };
}

async function findExistingIncident(projectName: string, incidentDate: Date, slug: string) {
  const legacySlug = toLegacyDefillamaSlug(slug);
  const existingBySlug = await RektIncident.findOne({
    where: { slug: { [Op.in]: [slug, legacySlug] } },
  });
  if (existingBySlug) return existingBySlug;

  return RektIncident.findOne({
    where: {
      projectName: { [Op.iLike]: projectName },
      incidentDate,
    },
  });
}

export async function importDefiLlamaHacks(options: {
  dryRun?: boolean;
  limit?: number;
  url?: string;
} = {}): Promise<RektImportResult> {
  const url = options.url || DEFAULT_DEFILLAMA_HACKS_URL;
  const response = await axios.get<DefiLlamaHack[]>(url, { timeout: 30_000 });
  const rows = Array.isArray(response.data) ? response.data : [];
  const slice = options.limit ? rows.slice(0, options.limit) : rows;
  const result: RektImportResult = {
    source: "defillama",
    fetched: rows.length,
    imported: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    dryRun: Boolean(options.dryRun),
  };

  for (const row of slice) {
    if (!row?.name || !row.date || row.date * 1000 > Date.now() + 86_400_000) {
      result.skipped += 1;
      continue;
    }

    const normalized = normalizeDefiLlamaHack(row);
    result.imported += 1;
    if (options.dryRun) continue;

    const existing = await findExistingIncident(
      normalized.projectName,
      normalized.incidentDate,
      normalized.slug,
    );
    if (existing) {
      const nextSlug = stripDefillamaSlugPrefix(existing.slug);
      await existing.update({
        ...normalized,
        slug: nextSlug,
        sourceUrls: sanitizeSourceUrls([
          ...(existing.sourceUrls || []),
          ...normalized.sourceUrls,
        ]),
        tags: compact([...(existing.tags || []), ...normalized.tags]).filter(
          (tag) => tag.toLowerCase() !== "defillama",
        ),
        auditorNames: existing.auditorNames || [],
        affectedAddresses: existing.affectedAddresses || [],
        transactionHashes: existing.transactionHashes || [],
      });
      result.updated += 1;
    } else {
      await RektIncident.create(normalized);
      result.created += 1;
    }
  }

  logger.info("[REKT] DeFiLlama import complete", result);
  return result;
}
