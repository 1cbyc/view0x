/** IDs must match frontend contractExamples / vulnerableExamples entries. */
export type ScannerCuratedExample = {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  tier: "high-risk" | "practice";
};

export const scannerCuratedExamples: ScannerCuratedExample[] = [
  {
    id: "vulnerable-wallet",
    name: "Vulnerable Wallet",
    subtitle: "Reentrancy on withdraw",
    badge: "Reentrancy",
    tier: "high-risk",
  },
  {
    id: "reentrancy-erc20",
    name: "Reentrancy ERC20",
    subtitle: "Classic external call before state update",
    badge: "Critical",
    tier: "high-risk",
  },
  {
    id: "simple-storage",
    name: "Simple Storage",
    subtitle: "Baseline contract to learn scanning",
    badge: "Beginner",
    tier: "practice",
  },
  {
    id: "erc20-token",
    name: "ERC20 Token",
    subtitle: "Standard token implementation",
    badge: "ERC20",
    tier: "practice",
  },
];
