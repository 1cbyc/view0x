import { getDefaultConfig } from "@rainbow-me/rainbowkit";
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

export const wagmiConfig = getDefaultConfig({
  appName: "view0x Shield",
  projectId,
  chains: [mainnet, bsc, base, arbitrum, polygon, optimism, avalanche],
  ssr: false,
});
