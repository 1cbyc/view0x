import { runHeuristics } from "../../services/addressScan/heuristics";
import type { ExplorerContractInfo } from "../../shared/types/addressScan";

const baseExplorer = (source: string | null): ExplorerContractInfo => ({
  address: "0x0000000000000000000000000000000000000001",
  chainId: 1,
  hasBytecode: true,
  contractName: "Test",
  isVerified: Boolean(source),
  isProxy: false,
  implementationAddress: null,
  compilerVersion: null,
  sourceCode: source,
  abi: null,
  explorerUrl: "https://etherscan.io/address/0x1",
});

describe("runHeuristics", () => {
  it("flags unverified contracts", () => {
    const flags = runHeuristics(baseExplorer(null));
    expect(flags.some((f) => f.id === "unverified-source")).toBe(true);
  });

  it("detects mint in source", () => {
    const flags = runHeuristics(
      baseExplorer("contract T { function mint() public onlyOwner {} }"),
    );
    expect(flags.some((f) => f.id === "mintable")).toBe(true);
  });
});
