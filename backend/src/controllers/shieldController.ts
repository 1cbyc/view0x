import { Request, Response } from "express";
import { getAddress } from "ethers";
import { getChain, listShieldChains } from "../config/chains";
import { AppError } from "../middleware/errorHandler";
import {
  buildShieldSnapshot,
  getShieldApprovals,
  getShieldApprovalHistory,
  getShieldHoldings,
  getShieldNftApprovals,
  getShieldPermit2Approvals,
  runShieldScan,
} from "../services/shield/shieldSnapshot";
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
    })),
  });
};

function shieldRpcError(err: unknown): never {
  if (err instanceof AppError) throw err;
  const msg = err instanceof Error ? err.message : String(err);
  if (/rate limit|429|too many requests/i.test(msg)) {
    throw new AppError(
      "Network is busy. Wait a minute and try again.",
      503,
      "RPC_RATE_LIMIT",
    );
  }
  if (/range|too many|block range|query timeout|exceed/i.test(msg)) {
    throw new AppError(
      "Could not load approvals for this wallet on this chain. Try again in a moment.",
      503,
      "RPC_LOG_RANGE",
    );
  }
  throw err;
}

export const getShieldScanHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  try {
    const data = await runShieldScan(parsed.chainId, parsed.address);
    res.json({ success: true, data });
  } catch (err) {
    shieldRpcError(err);
  }
};

export const getShieldSnapshotHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  try {
    const snapshot = await buildShieldSnapshot(parsed.chainId, parsed.address);
    res.json({ success: true, data: snapshot });
  } catch (err) {
    shieldRpcError(err);
  }
};

export const getShieldApprovalsHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  try {
    const approvals = await getShieldApprovals(parsed.chainId, parsed.address);
    res.json({
      success: true,
      data: {
        address: parsed.address,
        chainId: parsed.chainId,
        approvals,
      },
    });
  } catch (err) {
    shieldRpcError(err);
  }
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
    },
  });
};

export const getShieldPermit2ApprovalsHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  try {
    const permit2Approvals = await getShieldPermit2Approvals(
      parsed.chainId,
      parsed.address,
    );
    res.json({
      success: true,
      data: {
        address: parsed.address,
        chainId: parsed.chainId,
        permit2Approvals,
      },
    });
  } catch (err) {
    shieldRpcError(err);
  }
};

export const getShieldHistoryHandler = async (req: Request, res: Response) => {
  const parsed = parseAddressChain(req);
  if ("error" in parsed) {
    return res.status(400).json({
      success: false,
      error: { code: "BAD_REQUEST", message: parsed.error },
    });
  }

  try {
    const history = await getShieldApprovalHistory(parsed.chainId, parsed.address);
    res.json({
      success: true,
      data: {
        address: parsed.address,
        chainId: parsed.chainId,
        history,
      },
    });
  } catch (err) {
    shieldRpcError(err);
  }
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
    },
  });
};
