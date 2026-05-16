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

  const revokeCashBase =
    chainId === 56 ? "https://revoke.cash/bsc/" : "https://revoke.cash/ethereum/";
  const revokeByChain = address ? `${revokeCashBase}${address}` : revokeCashBase;

  const approvalChecker =
    chainId === 56
      ? address
        ? `https://bscscan.com/tokenapprovalchecker?search=${address}`
        : "https://bscscan.com/tokenapprovalchecker"
      : address
        ? `https://etherscan.io/tokenapprovalchecker?search=${address}`
        : "https://etherscan.io/tokenapprovalchecker";

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
        "view0x does not scrape your allowances yet — use revoke.cash and the explorer checker to audit spenders safely.",
    },
  });
};
