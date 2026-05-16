#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const usage = () => {
  console.log(`view0x CLI

Usage:
  node scripts/view0x-cli.mjs analyze <contract.sol> [--base-url http://localhost:18088]

Environment:
  VIEW0X_BASE_URL  Defaults to http://localhost:18088
`);
};

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  usage();
  process.exit(0);
}

const optionValue = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

if (command !== "analyze") {
  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}

const filePath = args[1];
if (!filePath) {
  console.error("Missing Solidity file path.");
  usage();
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
const contractCode = fs.readFileSync(absolutePath, "utf8");
const baseUrl = optionValue("--base-url", process.env.VIEW0X_BASE_URL || "http://localhost:18088").replace(/\/$/, "");

const response = await fetch(`${baseUrl}/api/analysis/public`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contractCode }),
});

const payload = await response.json();
if (!response.ok || payload.success === false) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const data = payload.data || {};
console.log(`view0x analysis for ${path.basename(absolutePath)}`);
console.log(`Vulnerabilities: ${data.summary?.totalVulnerabilities ?? data.vulnerabilities?.length ?? 0}`);
console.log(`High: ${data.summary?.highSeverity ?? 0}`);
console.log(`Medium: ${data.summary?.mediumSeverity ?? 0}`);
console.log(`Low: ${data.summary?.lowSeverity ?? 0}`);

if (Array.isArray(data.vulnerabilities) && data.vulnerabilities.length > 0) {
  console.log("\nFindings:");
  for (const finding of data.vulnerabilities) {
    console.log(`- [${finding.severity || "UNKNOWN"}] ${finding.title || finding.type || "Finding"}`);
  }
}
