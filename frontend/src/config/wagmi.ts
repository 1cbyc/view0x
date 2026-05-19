import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, fallback } from "wagmi";
import {
  mainnet,
  bsc,
  base,
  arbitrum,
  polygon,
  optimism,
  avalanche,
} from "wagmi/chains";

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "view0x-local-dev";

/**
 * Avoid WalletConnect / MetaMask default RPC (eth.merkle.io) — it blocks browser CORS
 * and rate-limits aggressively. Revoke txs still go through the connected wallet.
 */
const transports = {
  [mainnet.id]: fallback([
    http("https://ethereum.publicnode.com"),
    http("https://eth.llamarpc.com"),
  ]),
  [bsc.id]: http("https://bsc-dataseed.binance.org"),
  [base.id]: http("https://mainnet.base.org"),
  [arbitrum.id]: http("https://arb1.arbitrum.io/rpc"),
  [polygon.id]: http("https://polygon-rpc.com"),
  [optimism.id]: http("https://mainnet.optimism.io"),
  [avalanche.id]: http("https://api.avax.network/ext/bc/C/rpc"),
} as const;

export const wagmiConfig = getDefaultConfig({
  appName: "view0x Shield",
  projectId,
  chains: [mainnet, bsc, base, arbitrum, polygon, optimism, avalanche],
  transports,
  ssr: false,
});
