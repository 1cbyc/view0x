export interface ChainConfig {
  id: number;
  key: string;
  name: string;
  nativeSymbol: string;
  explorerApiUrl: string;
  explorerWebUrl: string;
  apiKeyEnv: "ETHERSCAN_API_KEY" | "BSCSCAN_API_KEY";
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    key: "ethereum",
    name: "Ethereum",
    nativeSymbol: "ETH",
    explorerApiUrl: "https://api.etherscan.io/api",
    explorerWebUrl: "https://etherscan.io",
    apiKeyEnv: "ETHERSCAN_API_KEY",
  },
  56: {
    id: 56,
    key: "bsc",
    name: "BNB Smart Chain",
    nativeSymbol: "BNB",
    explorerApiUrl: "https://api.bscscan.com/api",
    explorerWebUrl: "https://bscscan.com",
    apiKeyEnv: "BSCSCAN_API_KEY",
  },
};

export function getChain(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS[chainId];
}

export function listChains(): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS);
}
