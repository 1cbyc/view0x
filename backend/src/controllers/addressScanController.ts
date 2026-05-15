import { Request, Response } from "express";
import { scanContractAddress, getSupportedChains } from "../services/addressScan/addressScanService";
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
    const result = await scanContractAddress({
      address,
      chainId: Number(chainId),
      runSlither: Boolean(runSlither),
    });

    logger.info(
      `Address scan ${result.address} on chain ${result.chainId}: score=${result.reputationScore} risk=${result.riskLevel}`,
    );

    res.json({
      success: true,
      message: "Address scan completed",
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Address scan failed";
    logger.error("Address scan error:", error);
    res.status(400).json({
      success: false,
      error: { code: "SCAN_FAILED", message },
    });
  }
};
