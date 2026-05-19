import type { Chain, WalletClient } from "viem";
import { zeroAddress } from "viem";
import type {
  ShieldApproval,
  ShieldNftApproval,
  ShieldPermit2Approval,
} from "@/services/api";

/** Uniswap Permit2 — same address on supported EVM chains. */
export const PERMIT2_ADDRESS =
  "0x000000000022D473030F116dDEE9F6B43aC78BA9" as const;

export const PERMIT2_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

export type PendingShieldRevoke =
  | { kind: "erc20"; approval: ShieldApproval }
  | { kind: "nft"; approval: ShieldNftApproval }
  | { kind: "permit2"; approval: ShieldPermit2Approval }
  | { kind: "eip7702" };

export async function revokeEip7702Delegation(
  walletClient: WalletClient,
  account: `0x${string}`,
  chain: Chain,
): Promise<`0x${string}`> {
  const authorization = await walletClient.signAuthorization({
    account,
    contractAddress: zeroAddress,
  });

  return walletClient.sendTransaction({
    account,
    chain,
    to: account,
    data: "0x",
    authorizationList: [authorization],
  });
}
