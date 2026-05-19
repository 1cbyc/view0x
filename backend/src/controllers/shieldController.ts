import { Request, Response } from "express";
import { getAddress } from "ethers";
import { getChain, listShieldChains } from "../config/chains";
import {
  buildShieldSnapshot,
  getShieldApprovals,
  getShieldHoldings,
  getShieldNftApprovals,
} from "../services/shield/shieldSnapshot";
import { getIndexerNote } from "../services/shield/shieldRpc";

function parseAddressChain(req: Request): { address: string; chainId: number } | { error: string } {
  const raw = typeof req.query.address === "string" ? req.query.address.trim() : "";
  const chainId = Number(req.query.chainId || 1);

  if (!raw) {
    return { error: "address query parameter is required" };
  }

  const chain = getChain(chainId);
  if (!chain) {
    return { error: "Unsupported chainId" };
  }

  try {
    return { address: getAddress(raw), chainId };
  } catch {
    return { error: "Invalid address" };
  }
}

export const listShieldChainsHandler = (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: listShieldChains().map((c) => ({
      chainId: c.id,
      key: c.key,
      name: c.name,
      nativeSymbol: c.nativeSymbol,
      indexerNote: getIndexerNote(c.id),
    })),
  });
};

export const getShieldSnapshotHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  const snapshot = await buildShieldSnapshot(parsed.chainId, parsed.address);
  res.json({ success: true, data: snapshot });
};

export const getShieldApprovalsHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  const approvals = await getShieldApprovals(parsed.chainId, parsed.address);
  res.json({
    success: true,
    data: {
      address: parsed.address,
      chainId: parsed.chainId,
      approvals,
      indexerNote: getIndexerNote(parsed.chainId),
    },
  });
};

export const getShieldNftApprovalsHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  const nftApprovals = await getShieldNftApprovals(parsed.chainId, parsed.address);
  res.json({
    success: true,
    data: {
      address: parsed.address,
      chainId: parsed.chainId,
      nftApprovals,
      indexerNote: getIndexerNote(parsed.chainId),
    },
  });
};

export const getShieldHoldingsHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  const holdings = await getShieldHoldings(parsed.chainId, parsed.address);
  res.json({
    success: true,
    data: {
      address: parsed.address,
      chainId: parsed.chainId,
      holdings,
      indexerNote: getIndexerNote(parsed.chainId),
    },
  });
};
