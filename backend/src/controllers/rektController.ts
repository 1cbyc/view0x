import { Request, Response } from "express";
import {
  getRektFacets,
  getRektIncidentBySlug,
  getRektStats,
  listRektIncidents,
} from "../services/rektIncidentService";

function parseDate(value: unknown): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export const listIncidents = async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.limit || "20"), 10) || 20),
  );
  const allowedSorts = new Set(["amountLostUsd", "incidentDate", "projectName"]);
  const sortBy = allowedSorts.has(String(req.query.sortBy))
    ? (String(req.query.sortBy) as "amountLostUsd" | "incidentDate" | "projectName")
    : "amountLostUsd";
  const sortOrder = String(req.query.sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

  const data = await listRektIncidents({
    q: typeof req.query.q === "string" ? req.query.q.trim() : undefined,
    chain: typeof req.query.chain === "string" ? req.query.chain : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    attackType: typeof req.query.attackType === "string" ? req.query.attackType : undefined,
    auditor: typeof req.query.auditor === "string" ? req.query.auditor : undefined,
    severity: typeof req.query.severity === "string" ? req.query.severity : undefined,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
    from: parseDate(req.query.from),
    to: parseDate(req.query.to),
    page,
    limit,
    sortBy,
    sortOrder,
  });

  res.json({ success: true, data: data.incidents, meta: { pagination: data.pagination } });
};

export const getIncident = async (req: Request, res: Response) => {
  const incident = await getRektIncidentBySlug(req.params.slug);
  if (!incident) {
    return res.status(404).json({
      success: false,
      error: { code: "INCIDENT_NOT_FOUND", message: "Incident not found" },
    });
  }
  res.json({ success: true, data: incident });
};

export const getStats = async (_req: Request, res: Response) => {
  res.json({ success: true, data: await getRektStats() });
};

export const getFacets = async (_req: Request, res: Response) => {
  res.json({ success: true, data: await getRektFacets() });
};
