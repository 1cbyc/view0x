import { getAddress } from "ethers";
import { getChain } from "../../config/chains";
import { normalizeAddress } from "../explorer/addressValidation";
import type { ShieldEip7702Delegation } from "../../shared/types/shield";
import { getShieldProvider } from "./shieldRpc";

/** EIP-7702 delegation designator prefix (see EIP-7702). */
const DELEGATION_PREFIX = "0xef0100";

export async function fetchEip7702Delegation(
  chainId: number,
  ownerInput: string,
): Promise<ShieldEip7702Delegation | null> {
  if (!getChain(chainId)) return null;

  const owner = normalizeAddress(ownerInput);
  const provider = getShieldProvider(chainId);
  const code = await provider.getCode(owner);
  const hex = (code || "0x").toLowerCase();

  if (!hex.startsWith(DELEGATION_PREFIX) || hex.length < 8 + 40) {
    return { hasDelegation: false, delegate: null };
  }

  try {
    const delegate = getAddress(`0x${hex.slice(8, 8 + 40)}`);
    return { hasDelegation: true, delegate };
  } catch {
    return { hasDelegation: false, delegate: null };
  }
}
