import { withHeuristicGuidance } from "../../services/addressScan/heuristicGuidance";

describe("withHeuristicGuidance", () => {
  it("adds guidance for known ids", () => {
    const [h] = withHeuristicGuidance([
      {
        id: "mintable",
        category: "ownership",
        title: "Mint function",
        description: "desc",
        severity: "high",
      },
    ]);
    expect(h.guidance).toBeDefined();
    expect(h.guidance!.length).toBeGreaterThan(20);
  });
});
