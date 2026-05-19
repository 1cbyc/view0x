export type ExplorerApiKind = "etherscan-v2" | "bscscan";

export interface ChainConfig {
  id: number;
  key: string;
  name: string;
  nativeSymbol: string;
  explorerApiUrl: string;
  explorerWebUrl: string;
  explorerKind: ExplorerApiKind;
  /** Env var for explorer API key */
  apiKeyEnv: string;
  /** Public RPC for Shield indexer (overridden when ALCHEMY_API_KEY is set) */
  publicRpcUrl: string;
  /** Alchemy network slug when using ALCHEMY_API_KEY */
  alchemyNetwork?: string;
}

/** Etherscan API v2 — single base URL, pass `chainid` per request */
const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    key: "ethereum",
    name: "Ethereum",
    nativeSymbol: "ETH",
    explorerApiUrl: ETHERSCAN_V2,
    explorerWebUrl: "https://etherscan.io",
    explorerKind: "etherscan-v2",
    apiKeyEnv: "ETHERSCAN_API_KEY",
    publicRpcUrl: "https://eth.llamarpc.com",
    alchemyNetwork: "eth-mainnet",
  },
  56: {
    id: 56,
    key: "bsc",
    name: "BNB Smart Chain",
    nativeSymbol: "BNB",
    explorerApiUrl: "https://api.bscscan.com/api",
    explorerWebUrl: "https://bscscan.com",
    explorerKind: "bscscan",
    apiKeyEnv: "BSCSCAN_API_KEY",
    publicRpcUrl: "https://bsc-dataseed.binance.org",
    alchemyNetwork: "bnb-mainnet",
  },
  8453: {
    id: 8453,
    key: "base",
    name: "Base",
    nativeSymbol: "ETH",
    explorerApiUrl: ETHERSCAN_V2,
    explorerWebUrl: "https://basescan.org",
    explorerKind: "etherscan-v2",
    apiKeyEnv: "BASESCAN_API_KEY",
    publicRpcUrl: "https://mainnet.base.org",
    alchemyNetwork: "base-mainnet",
  },
  42161: {
    id: 42161,
    key: "arbitrum",
    name: "Arbitrum One",
    nativeSymbol: "ETH",
    explorerApiUrl: ETHERSCAN_V2,
    explorerWebUrl: "https://arbiscan.io",
    explorerKind: "etherscan-v2",
    apiKeyEnv: "ARBISCAN_API_KEY",
    publicRpcUrl: "https://arb1.arbitrum.io/rpc",
    alchemyNetwork: "arb-mainnet",
  },
  137: {
    id: 137,
    key: "polygon",
    name: "Polygon",
    nativeSymbol: "POL",
    explorerApiUrl: ETHERSCAN_V2,
    explorerWebUrl: "https://polygonscan.com",
    explorerKind: "etherscan-v2",
    apiKeyEnv: "POLYGONSCAN_API_KEY",
    publicRpcUrl: "https://polygon-rpc.com",
    alchemyNetwork: "polygon-mainnet",
  },
  10: {
    id: 10,
    key: "optimism",
    name: "Optimism",
    nativeSymbol: "ETH",
    explorerApiUrl: ETHERSCAN_V2,
    explorerWebUrl: "https://optimistic.etherscan.io",
    explorerKind: "etherscan-v2",
    apiKeyEnv: "OPTIMISM_API_KEY",
    publicRpcUrl: "https://mainnet.optimism.io",
    alchemyNetwork: "opt-mainnet",
  },
  43114: {
    id: 43114,
    key: "avalanche",
    name: "Avalanche C-Chain",
    nativeSymbol: "AVAX",
    explorerApiUrl: ETHERSCAN_V2,
    explorerWebUrl: "https://snowscan.xyz",
    explorerKind: "etherscan-v2",
    apiKeyEnv: "SNOWTRACE_API_KEY",
    publicRpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    alchemyNetwork: "avax-mainnet",
  },
};

export function getChain(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS[chainId];
}

export function listChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS);
}

export function listShieldChains(): ChainConfig[] {
  return listChains();
}
