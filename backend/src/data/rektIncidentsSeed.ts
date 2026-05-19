import type { RektIncidentSeverity, RektIncidentStatus } from "../models/RektIncident";

export type RektIncidentSeed = {
  slug: string;
  projectName: string;
  title: string;
  incidentDate: string;
  amountLostUsd?: string;
  amountRecoveredUsd?: string;
  severity: RektIncidentSeverity;
  status: RektIncidentStatus;
  chains: string[];
  categories: string[];
  attackTypes: string[];
  auditorNames?: string[];
  summary: string;
  rootCause?: string;
  technicalDetails?: string;
  remediation?: string;
  affectedAddresses?: Array<{ label: string; address: string; chain?: string; role?: string }>;
  transactionHashes?: Array<{ label: string; hash: string; chain?: string; url?: string }>;
  sourceUrls?: string[];
  tags?: string[];
};

export const rektIncidentsSeed: RektIncidentSeed[] = [
  {
    slug: "ronin-bridge-validator-key-compromise-2022",
    projectName: "Ronin Bridge",
    title: "Ronin Bridge validator key compromise",
    incidentDate: "2022-03-23",
    amountLostUsd: "624000000.00",
    amountRecoveredUsd: "5600000.00",
    severity: "CRITICAL",
    status: "partial_recovery",
    chains: ["Ethereum", "Ronin"],
    categories: ["Bridge", "Gaming"],
    attackTypes: ["Private key compromise", "Validator compromise"],
    summary:
      "Attackers used compromised validator keys to authorize fraudulent withdrawals from the Ronin bridge.",
    rootCause:
      "Insufficient validator decentralization and compromised signing keys allowed forged bridge withdrawals.",
    technicalDetails:
      "The bridge accepted signatures from a small validator threshold, so control of enough keys enabled withdrawals without legitimate deposits.",
    remediation:
      "Increase validator threshold, isolate signing infrastructure, monitor bridge withdrawals, and require multi-party operational controls.",
    sourceUrls: ["https://roninblockchain.substack.com/p/community-alert-ronin-validators"],
    tags: ["bridge", "key-management", "validator"],
  },
  {
    slug: "poly-network-cross-chain-validation-2021",
    projectName: "Poly Network",
    title: "Poly Network cross-chain validation exploit",
    incidentDate: "2021-08-10",
    amountLostUsd: "611000000.00",
    amountRecoveredUsd: "611000000.00",
    severity: "CRITICAL",
    status: "recovered",
    chains: ["Ethereum", "BSC", "Polygon"],
    categories: ["Bridge"],
    attackTypes: ["Access control", "Cross-chain message validation"],
    summary:
      "A cross-chain verification flaw let the attacker craft messages that transferred control of assets across multiple chains.",
    rootCause:
      "Insufficient validation of cross-chain contract calls allowed privileged operations to be invoked through forged messages.",
    remediation:
      "Harden cross-chain message authentication, isolate privileged call paths, and add independent circuit breakers for bridge withdrawals.",
    sourceUrls: ["https://poly.network/#/blog/50"],
    tags: ["bridge", "access-control"],
  },
  {
    slug: "wormhole-solana-bridge-signature-bypass-2022",
    projectName: "Wormhole",
    title: "Wormhole Solana bridge signature verification bypass",
    incidentDate: "2022-02-02",
    amountLostUsd: "326000000.00",
    amountRecoveredUsd: "326000000.00",
    severity: "CRITICAL",
    status: "recovered",
    chains: ["Solana", "Ethereum"],
    categories: ["Bridge"],
    attackTypes: ["Signature verification", "Smart contract exploit"],
    summary:
      "An attacker minted wrapped ETH on Solana by bypassing bridge guardian signature verification.",
    rootCause:
      "A verification routine accepted spoofed guardian signatures because of a contract validation flaw.",
    remediation:
      "Patch signature verification, deploy formal verification around message authentication, and monitor wrapped asset supply deltas.",
    sourceUrls: ["https://wormhole.com/wormhole-incident-report/"],
    tags: ["bridge", "signature-validation"],
  },
  {
    slug: "nomad-bridge-replica-initialization-2022",
    projectName: "Nomad Bridge",
    title: "Nomad Bridge replica initialization exploit",
    incidentDate: "2022-08-01",
    amountLostUsd: "190000000.00",
    amountRecoveredUsd: "36000000.00",
    severity: "CRITICAL",
    status: "partial_recovery",
    chains: ["Ethereum", "Moonbeam"],
    categories: ["Bridge"],
    attackTypes: ["Initialization bug", "Message validation"],
    summary:
      "A faulty initialization accepted invalid messages as proven, allowing many copycat withdrawals from the bridge.",
    rootCause:
      "A trusted root was initialized in a way that made arbitrary messages pass verification.",
    remediation:
      "Use upgrade runbooks with invariant checks, delayed activation, and automated bridge pause conditions for abnormal withdrawals.",
    sourceUrls: ["https://medium.com/nomad-xyz-blog/nomad-bridge-hack-post-mortem-13f3c90a2da1"],
    tags: ["bridge", "upgrade", "initialization"],
  },
  {
    slug: "be-nstalk-flash-loan-governance-2022",
    projectName: "Beanstalk",
    title: "Beanstalk flash-loan governance takeover",
    incidentDate: "2022-04-17",
    amountLostUsd: "182000000.00",
    severity: "CRITICAL",
    status: "confirmed",
    chains: ["Ethereum"],
    categories: ["Stablecoin", "DAO"],
    attackTypes: ["Flash loan", "Governance attack"],
    summary:
      "A flash loan gave the attacker enough temporary voting power to pass and execute a malicious governance proposal.",
    rootCause:
      "Governance voting power could be borrowed and used immediately without adequate timelock or snapshot protections.",
    remediation:
      "Use voting snapshots, proposal timelocks, quorum safeguards, and emergency veto controls for privileged governance actions.",
    sourceUrls: ["https://medium.com/beanstalkfarms/beanstalk-exploit-analysis-15f3e84953c8"],
    tags: ["governance", "flash-loan"],
  },
  {
    slug: "euler-donation-accounting-exploit-2023",
    projectName: "Euler Finance",
    title: "Euler Finance donation accounting exploit",
    incidentDate: "2023-03-13",
    amountLostUsd: "197000000.00",
    amountRecoveredUsd: "197000000.00",
    severity: "CRITICAL",
    status: "recovered",
    chains: ["Ethereum"],
    categories: ["Borrowing & Lending"],
    attackTypes: ["Accounting bug", "Flash loan", "Liquidation"],
    summary:
      "The attacker manipulated internal debt and collateral accounting, then triggered liquidations to drain protocol funds.",
    rootCause:
      "A donation path altered account health in a way that bypassed expected collateralization assumptions.",
    remediation:
      "Add solvency invariant tests, isolate accounting side effects, and require audits for donation or debt-mutating code paths.",
    sourceUrls: ["https://www.euler.finance/blog/euler-protocol-exploit-and-recovery"],
    tags: ["lending", "accounting"],
  },
  {
    slug: "mango-markets-oracle-manipulation-2022",
    projectName: "Mango Markets",
    title: "Mango Markets oracle price manipulation",
    incidentDate: "2022-10-11",
    amountLostUsd: "116000000.00",
    amountRecoveredUsd: "67000000.00",
    severity: "CRITICAL",
    status: "partial_recovery",
    chains: ["Solana"],
    categories: ["DEX", "Derivatives"],
    attackTypes: ["Oracle manipulation", "Market manipulation"],
    summary:
      "The attacker manipulated the MNGO oracle price and used inflated collateral value to borrow protocol assets.",
    rootCause:
      "Thin market liquidity and oracle design allowed manipulated spot prices to create borrowable collateral value.",
    remediation:
      "Use robust oracle aggregation, liquidity-aware risk limits, and caps for collateral whose price can be moved cheaply.",
    sourceUrls: ["https://www.mangomarkets.com/"],
    tags: ["oracle", "solana", "market-manipulation"],
  },
  {
    slug: "cream-finance-read-only-reentrancy-2021",
    projectName: "Cream Finance",
    title: "Cream Finance lending market exploit",
    incidentDate: "2021-10-27",
    amountLostUsd: "130000000.00",
    severity: "CRITICAL",
    status: "confirmed",
    chains: ["Ethereum"],
    categories: ["Borrowing & Lending"],
    attackTypes: ["Oracle manipulation", "Reentrancy", "Flash loan"],
    summary:
      "The protocol suffered a large lending exploit involving manipulated collateral valuation and recursive borrowing flows.",
    rootCause:
      "Price and collateral assumptions were violated through composable calls and manipulated asset accounting.",
    remediation:
      "Constrain collateral markets, harden oracle assumptions, and test recursive call graphs against liquidity shocks.",
    sourceUrls: ["https://creamfinance.medium.com/"],
    tags: ["lending", "oracle", "reentrancy"],
  },
  {
    slug: "badgerdao-front-end-api-key-compromise-2021",
    projectName: "BadgerDAO",
    title: "BadgerDAO front-end approval compromise",
    incidentDate: "2021-12-02",
    amountLostUsd: "120000000.00",
    amountRecoveredUsd: "9000000.00",
    severity: "CRITICAL",
    status: "partial_recovery",
    chains: ["Ethereum"],
    categories: ["Yield Aggregator"],
    attackTypes: ["Frontend compromise", "Malicious approvals", "API key compromise"],
    summary:
      "A compromised front-end injected malicious approval requests that let attackers transfer user assets.",
    rootCause:
      "Compromised infrastructure allowed transaction UI manipulation outside the smart contracts themselves.",
    remediation:
      "Protect deployment credentials, add content integrity checks, show human-readable transaction simulation, and monitor approval anomalies.",
    sourceUrls: ["https://badger.com/"],
    tags: ["frontend", "approvals", "supply-chain"],
  },
  {
    slug: "curve-vyper-reentrancy-2023",
    projectName: "Curve Finance",
    title: "Curve pools affected by Vyper compiler reentrancy bug",
    incidentDate: "2023-07-30",
    amountLostUsd: "73500000.00",
    amountRecoveredUsd: "52000000.00",
    severity: "CRITICAL",
    status: "partial_recovery",
    chains: ["Ethereum", "Arbitrum"],
    categories: ["DEX"],
    attackTypes: ["Compiler bug", "Reentrancy"],
    summary:
      "Several Vyper-based pools were exploited after vulnerable compiler versions failed to enforce a reentrancy guard correctly.",
    rootCause:
      "A compiler-level bug in selected Vyper versions broke expected non-reentrant protections.",
    remediation:
      "Track compiler provenance, pin safe compiler versions, and add runtime invariant monitoring around pool balance changes.",
    sourceUrls: ["https://curve.fi/"],
    tags: ["dex", "compiler", "vyper"],
  },
  {
    slug: "kyberswap-elastic-liquidity-math-2023",
    projectName: "KyberSwap",
    title: "KyberSwap Elastic concentrated liquidity exploit",
    incidentDate: "2023-11-22",
    amountLostUsd: "48000000.00",
    amountRecoveredUsd: "5700000.00",
    severity: "CRITICAL",
    status: "partial_recovery",
    chains: ["Ethereum", "Arbitrum", "Optimism", "Polygon", "Base"],
    categories: ["DEX"],
    attackTypes: ["Precision error", "Liquidity accounting"],
    summary:
      "The attacker manipulated concentrated liquidity accounting to drain funds from affected pools across several chains.",
    rootCause:
      "A subtle math and tick-accounting flaw allowed liquidity to be double-counted in swap calculations.",
    remediation:
      "Increase invariant/property testing for AMM math and add chain-wide emergency pool controls.",
    sourceUrls: ["https://blog.kyberswap.com/"],
    tags: ["dex", "amm", "precision"],
  },
  {
    slug: "pancakebunny-flash-loan-price-manipulation-2021",
    projectName: "PancakeBunny",
    title: "PancakeBunny flash-loan price manipulation",
    incidentDate: "2021-05-19",
    amountLostUsd: "45000000.00",
    severity: "CRITICAL",
    status: "confirmed",
    chains: ["BNB Smart Chain"],
    categories: ["Yield Aggregator"],
    attackTypes: ["Flash loan", "Price manipulation"],
    summary:
      "A flash-loan-driven price manipulation let the attacker mint and sell a large amount of BUNNY tokens.",
    rootCause:
      "Reward minting depended on manipulable AMM prices without robust oracle controls.",
    remediation:
      "Use manipulation-resistant oracles, cap minting impact per block, and enforce liquidity-aware pricing checks.",
    sourceUrls: ["https://pancakebunny.medium.com/"],
    tags: ["bsc", "flash-loan", "oracle"],
  },
];
