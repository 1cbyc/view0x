import { Request, Response } from "express";
import { getChain } from "../config/chains";
import { getAddress } from "ethers";

/**
 * Curated outbound links — full allowance enumeration needs an indexer RPC (Phase 5+).
 */
export const walletRiskResources = (req: Request, res: Response) => {
  const raw = typeof req.query.address === "string" ? req.query.address : "";
  const chainId = Number(req.query.chainId || 1);

  const chain = getChain(chainId);
  if (!chain) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_CHAIN", message: "Unsupported chainId" },
    });
  }

  let address = raw.trim();
  try {
    if (address) {
      address = getAddress(address);
    }
  } catch {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_ADDRESS", message: "Invalid address" },
    });
  }

  const revokePaths: Record<number, string> = {
    1: "https://revoke.cash/ethereum/",
    56: "https://revoke.cash/bsc/",
    8453: "https://revoke.cash/base/",
    42161: "https://revoke.cash/arbitrum/",
    137: "https://revoke.cash/polygon/",
    10: "https://revoke.cash/optimism/",
    43114: "https://revoke.cash/avalanche/",
  };
  const revokeCashBase = revokePaths[chainId] || "https://revoke.cash/";
  const revokeByChain = address ? `${revokeCashBase}${address}` : revokeCashBase;

  const explorerCheckers: Record<number, { base: string; checker: string }> = {
    1: { base: "https://etherscan.io", checker: "tokenapprovalchecker" },
    56: { base: "https://bscscan.com", checker: "tokenapprovalchecker" },
    8453: { base: "https://basescan.org", checker: "tokenapprovalchecker" },
    42161: { base: "https://arbiscan.io", checker: "tokenapprovalchecker" },
    137: { base: "https://polygonscan.com", checker: "tokenapprovalchecker" },
    10: { base: "https://optimistic.etherscan.io", checker: "tokenapprovalchecker" },
    43114: { base: "https://snowscan.xyz", checker: "tokenapprovalchecker" },
  };
  const explorer = explorerCheckers[chainId] || explorerCheckers[1];
  const approvalChecker = address
    ? `${explorer.base}/${explorer.checker}?search=${address}`
    : `${explorer.base}/${explorer.checker}`;

  const defillamaPortfolio = address
    ? `https://debank.com/profile/${address}`
    : "https://debank.com/";

  res.json({
    success: true,
    data: {
      chainId,
      chainName: chain.name,
      address: address || null,
      revokeCash: revokeByChain,
      explorerApprovalScanner: approvalChecker,
      walletPortfolioAggregator: defillamaPortfolio,
      note:
        "For native in-app revoke and risk scoring, use Shield. These links are a fallback when you are not connected.",
    },
  });
};
