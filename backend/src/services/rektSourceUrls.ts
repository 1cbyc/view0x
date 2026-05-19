const DEFILLAMA_HACKS_RE = /defillama\.com\/hacks/i;

export function isDefillamaHacksUrl(url: string): boolean {
  return DEFILLAMA_HACKS_RE.test(url);
}

/** Drop DeFiLlama hack listing links; keep real article / report URLs. */
export function sanitizeSourceUrls(urls: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls || []) {
    const url = raw?.trim();
    if (!url || !/^https?:\/\//i.test(url) || isDefillamaHacksUrl(url)) continue;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out;
}

/** When DeFiLlama has no per-incident URL, link to news / security search — not defillama.com/hacks. */
export function fallbackNewsSourceUrls(projectName: string): string[] {
  const name = projectName.trim();
  const q = encodeURIComponent(`${name} crypto hack exploit`);
  return [
    `https://www.coindesk.com/search?s=${encodeURIComponent(name)}`,
    `https://cointelegraph.com/search?query=${q}`,
    `https://rekt.news/`,
  ];
}

export function resolveHackSourceUrls(
  apiSource: string | null | undefined,
  projectName: string,
): string[] {
  const primary = apiSource?.trim();
  if (primary && /^https?:\/\//i.test(primary) && !isDefillamaHacksUrl(primary)) {
    return [primary];
  }
  return fallbackNewsSourceUrls(projectName);
}
