import { JsonRpcProvider } from "ethers";
import { getChain, type ChainConfig } from "../../config/chains";
import { env } from "../../config/environment";

const providerCache = new Map<string, JsonRpcProvider>();

export function getRpcUrl(chain: ChainConfig, preferAlchemy = true): string {
  if (preferAlchemy && env.ALCHEMY_API_KEY && chain.alchemyNetwork) {
    return `https://${chain.alchemyNetwork}.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;
  }
  return chain.publicRpcUrl;
}

export function getShieldProvider(chainId: number, preferAlchemy = true): JsonRpcProvider {
  const cacheKey = `${chainId}:${preferAlchemy ? "alchemy" : "public"}`;
  const cached = providerCache.get(cacheKey);
  if (cached) return cached;

  const chain = getChain(chainId);
  if (!chain) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  const provider = new JsonRpcProvider(getRpcUrl(chain, preferAlchemy), chainId, {
    staticNetwork: true,
  });
  providerCache.set(cacheKey, provider);
  return provider;
}

export function canFallbackToPublicRpc(chainId: number): boolean {
  const chain = getChain(chainId);
  return Boolean(env.ALCHEMY_API_KEY && chain?.alchemyNetwork);
}

export function isAlchemyNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /not enabled for this app|403 Forbidden|forbidden|unauthorized|invalid api key/i.test(msg);
}

