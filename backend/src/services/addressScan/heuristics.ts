import type { ExplorerContractInfo, HeuristicFlag } from "../../shared/types/addressScan";

interface PatternRule {
  id: string;
  category: HeuristicFlag["category"];
  title: string;
  description: string;
  severity: HeuristicFlag["severity"];
  pattern: RegExp;
}

const SOURCE_PATTERNS: PatternRule[] = [
  {
    id: "owner-privileges",
    category: "ownership",
    title: "Owner privileges",
    description: "Contract uses onlyOwner or similar admin controls — owner can change rules.",
    severity: "medium",
    pattern: /onlyOwner|_owner\s*\(|transferOwnership|renounceOwnership/i,
  },
  {
    id: "mintable",
    category: "ownership",
    title: "Mint function",
    description: "Token or supply may be mintable by privileged roles.",
    severity: "high",
    pattern: /\bmint\s*\(|\b_mint\s*\(/i,
  },
  {
    id: "blacklist",
    category: "trading",
    title: "Blacklist / blocklist",
    description: "Code can block specific wallets from transferring.",
    severity: "high",
    pattern: /blacklist|blocklist|isBlacklisted|isBot|_isExcluded/i,
  },
  {
    id: "high-tax",
    category: "trading",
    title: "Transfer tax / fee",
    description: "Buy/sell or transfer fees detected — common in meme tokens.",
    severity: "medium",
    pattern: /buyFee|sellFee|taxFee|_taxFee|setFee|liquidityFee/i,
  },
  {
    id: "honeypot-hint",
    category: "trading",
    title: "Trading restriction hints",
    description: "Patterns suggest trading may be restricted (anti-bot, max tx, cooldown).",
    severity: "high",
    pattern: /cannot\s+buy|cannot\s+sell|tradingEnabled|enableTrading|swapEnabled|_maxTxAmount/i,
  },
  {
    id: "delegatecall",
    category: "code",
    title: "Delegatecall usage",
    description: "Delegatecall can be risky if implementation is upgradeable or malicious.",
    severity: "medium",
    pattern: /delegatecall/i,
  },
  {
    id: "selfdestruct",
    category: "code",
    title: "Selfdestruct",
    description: "Contract can be destroyed, potentially locking funds.",
    severity: "high",
    pattern: /selfdestruct|suicide/i,
  },
  {
    id: "liquidity-add",
    category: "liquidity",
    title: "Liquidity functions",
    description: "Adds/removes liquidity — verify LP is locked and not single-sided rug vector.",
    severity: "info",
    pattern: /addLiquidity|removeLiquidity|swapExactTokensForETH/i,
  },
];

export function runHeuristics(explorer: ExplorerContractInfo): HeuristicFlag[] {
  const flags: HeuristicFlag[] = [];

  if (!explorer.sourceCode) {
    flags.push({
      id: "unverified-source",
      category: "verification",
      title: "Unverified source code",
      description:
        "Contract bytecode exists but source is not verified on the explorer — static analysis is limited.",
      severity: "high",
    });
    return flags;
  }

  const source = explorer.sourceCode;

  for (const rule of SOURCE_PATTERNS) {
    if (rule.pattern.test(source)) {
      flags.push({
        id: rule.id,
        category: rule.category,
        title: rule.title,
        description: rule.description,
        severity: rule.severity,
      });
    }
  }

  if (explorer.isProxy) {
    flags.push({
      id: "proxy-contract",
      category: "proxy",
      title: "Proxy contract",
      description: explorer.implementationAddress
        ? `Upgradeable proxy — implementation at ${explorer.implementationAddress}.`
        : "This contract is a proxy; review the implementation address.",
      severity: "medium",
    });
  }

  return flags;
}
