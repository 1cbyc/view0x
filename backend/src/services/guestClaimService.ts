import { Op } from "sequelize";
import { Analysis } from "../models/Analysis";
import { AddressScan } from "../models/AddressScan";
import { normalizeGuestSessionId } from "../utils/guestSession";
import { logger } from "../utils/logger";

export interface GuestClaimResult {
  analysesClaimed: number;
  addressScansClaimed: number;
}

/**
 * Attach anonymous work (contract analyses + address scans) to a user after sign-in.
 */
export async function claimGuestWork(
  userId: string,
  guestSessionIdRaw: string,
): Promise<GuestClaimResult> {
  const guestSessionId = normalizeGuestSessionId(guestSessionIdRaw);
  if (!guestSessionId) {
    return { analysesClaimed: 0, addressScansClaimed: 0 };
  }

  const unclaimedGuest = {
    guestSessionId,
    userId: { [Op.eq]: null } as { [Op.eq]: null },
  };

  const [analysesClaimed] = await Analysis.update(
    { userId },
    { where: unclaimedGuest },
  );

  const [addressScansClaimed] = await AddressScan.update(
    { userId },
    { where: unclaimedGuest },
  );

  if (analysesClaimed > 0 || addressScansClaimed > 0) {
    logger.info(
      `[GuestClaim] user=${userId} session=${guestSessionId} analyses=${analysesClaimed} addressScans=${addressScansClaimed}`,
    );
  }

  return { analysesClaimed, addressScansClaimed };
}
