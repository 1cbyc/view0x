/** Legacy import prefix — stripped from stored slugs and URLs. */
export const DEFILLAMA_SLUG_PREFIX = "defillama-";

export function slugifyRektValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 110);
}

export function buildRektIncidentSlug(
  projectName: string,
  incidentDate: string,
  techniqueOrClassification: string,
): string {
  return slugifyRektValue(
    `${projectName}-${incidentDate}-${techniqueOrClassification}`,
  );
}

export function stripDefillamaSlugPrefix(slug: string): string {
  return slug.startsWith(DEFILLAMA_SLUG_PREFIX)
    ? slug.slice(DEFILLAMA_SLUG_PREFIX.length)
    : slug;
}

export function toLegacyDefillamaSlug(slug: string): string {
  return slug.startsWith(DEFILLAMA_SLUG_PREFIX) ? slug : `${DEFILLAMA_SLUG_PREFIX}${slug}`;
}
