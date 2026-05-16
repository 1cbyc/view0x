import { Request, Response } from "express";
import {
  scanContractAddress,
  getAddressScanById,
  getSupportedChains,
  createAddressScanShareToken,
  getAddressScanByShareToken,
} from "../services/addressScan/addressScanService";
import { logger } from "../utils/logger";

export const listScanChains = async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: { chains: getSupportedChains() },
  });
};

export const scanAddress = async (req: Request, res: Response) => {
  try {
    const { address, chainId, runSlither } = req.body;
    const userId = req.user?.userId;

    const result = await scanContractAddress(
      {
        address,
        chainId: Number(chainId),
        runSlither: Boolean(runSlither),
      },
      userId,
    );

    logger.info(
      `Address scan ${result.scanId} ${result.address} chain ${result.chainId}: score=${result.reputationScore}`,
    );

    res.json({
      success: true,
      message: result.slitherJobId
        ? "Address scan completed; Slither analysis queued"
        : "Address scan completed",
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Address scan failed";
    logger.error("Address scan error:", error);
    const status = message.includes("Sign in") || message.includes("limit") ? 403 : 400;
    res.status(status).json({
      success: false,
      error: { code: "SCAN_FAILED", message },
    });
  }
};

export const createShareForScan = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Sign in to create a share link." },
      });
    }
    const { token } = await createAddressScanShareToken(req.params.id, userId);
    const appBase =
      process.env.APP_PUBLIC_URL?.replace(/\/$/, "") || "https://view0x.com";
    const shareUrl = `${appBase}/shared/scan/${token}`;
    res.json({ success: true, data: { token, shareUrl } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Share failed";
    res.status(400).json({ success: false, error: { code: "SHARE_FAILED", message } });
  }
};

export const getSharedScanResult = async (req: Request, res: Response) => {
  try {
    const data = await getAddressScanByShareToken(req.params.token);
    res.json({ success: true, data });
  } catch (error: unknown) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: error instanceof Error ? error.message : "Not found" },
    });
  }
};

export const getScanResult = async (req: Request, res: Response) => {
  try {
    const data = await getAddressScanById(req.params.id, req.user?.userId);
    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Not found";
    const status = message.includes("authorized") ? 403 : 404;
    res.status(status).json({
      success: false,
      error: { code: "SCAN_NOT_FOUND", message },
    });
  }
};
