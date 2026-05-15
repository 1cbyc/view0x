import { getAddress, isAddress } from "ethers";

export function normalizeAddress(address: string): string {
  const trimmed = address.trim();
  if (!isAddress(trimmed)) {
    throw new Error("Invalid Ethereum address format");
  }
  return getAddress(trimmed);
}

export function isContractBytecode(code: string): boolean {
  const normalized = code.toLowerCase();
  return normalized !== "0x" && normalized.length > 4;
}
