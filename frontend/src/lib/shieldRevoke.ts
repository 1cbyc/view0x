import type { WalletClient } from "viem";
import { zeroAddress } from "viem";
import type { ShieldApproval, ShieldNftApproval } from "@/services/api";

export type PendingShieldRevoke =
  | { kind: "erc20"; approval: ShieldApproval }
  | { kind: "nft"; approval: ShieldNftApproval }
  | { kind: "eip7702" };

export async function revokeEip7702Delegation(
  walletClient: WalletClient,
  account: `0x${string}`,
): Promise<`0x${string}`> {
  const authorization = await walletClient.signAuthorization({
    account,
    contractAddress: zeroAddress,
  });

  return walletClient.sendTransaction({
    account,
    to: account,
    data: "0x",
    authorizationList: [authorization],
  });
}
