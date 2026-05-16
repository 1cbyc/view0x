import type { HeuristicFlag } from "../../shared/types/addressScan";

/** Token-Sniffer style: what users should verify next. */
const GUIDANCE_BY_ID: Record<string, string> = {
  "unverified-source":
    "Do not ape into unverified contracts. Wait for explorer verification or request the team to publish sources before trusting funds.",
  "owner-privileges":
    "Privileged roles can freeze trading, migrate contracts, or drain reserves. Confirm the admin is multisig/time-locked or renounced.",
  mintable:
    "New supply can dilute holders. Confirm mint caps, timelocks, or that mint is disabled.",
  blacklist:
    "Your wallet could be denied from trading. Check community reports and simulate a tiny buy/sell on a fork if possible.",
  "high-tax":
    "High swap taxes often fund marketing or insiders. Confirm tax is bounded and documented for buyers.",
  "honeypot-hint":
    "Patterns suggest trading gates (anti-bot, enableTrading). Use a sandbox swap or explorer token tests before sizing in.",
  delegatecall:
    "Delegatecalls execute foreign logic in this contract context. Inspect the callee and upgrade governance.",
  selfdestruct:
    "Contract destruction can strand assets or migrate state unexpectedly; confirm no selfdestruct paths are reachable.",
  "liquidity-add":
    "LP add/remove hints — confirm liquidity is locked/renounced and not single-sided rinse risk.",
  "proxy-contract":
    "Implementations can be upgraded without user opt-in; review governance and implementation source history.",
};

export function withHeuristicGuidance(flags: HeuristicFlag[]): HeuristicFlag[] {
  return flags.map((f) => ({
    ...f,
    guidance:
      GUIDANCE_BY_ID[f.id] ||
      "Cross-check against recent rug patterns and explorer comments before allocating capital.",
  }));
}
