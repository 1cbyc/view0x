import { JsonRpcProvider } from "ethers";
import { getChain, type ChainConfig } from "../../config/chains";
import { env } from "../../config/environment";

const providerCache = new Map<number, JsonRpcProvider>();

export function getRpcUrl(chain: ChainConfig): string {
  if (env.ALCHEMY_API_KEY && chain.alchemyNetwork) {
    return `https://${chain.alchemyNetwork}.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;
  }
  return chain.publicRpcUrl;
}

export function getShieldProvider(chainId: number): JsonRpcProvider {
  const cached = providerCache.get(chainId);
  if (cached) return cached;

  const chain = getChain(chainId);
  if (!chain) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  const provider = new JsonRpcProvider(getRpcUrl(chain), chainId, {
    staticNetwork: true,
  });
  providerCache.set(chainId, provider);
  return provider;
}

export function getIndexerNote(chainId: number): string {
  const chain = getChain(chainId);
  if (!chain) return "";
  if (env.ALCHEMY_API_KEY && chain.alchemyNetwork) {
    return "Indexed via Alchemy RPC. Approval history is limited to recent blocks for performance.";
  }
  return "Indexed via public RPC. Set ALCHEMY_API_KEY for better reliability. Approval history is limited to recent blocks.";
}
