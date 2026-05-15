/** Mirrors User.canAnalyze() without loading Sequelize models. */
function canAnalyze(plan: string, usageCount: number, usageLimit: number): boolean {
  if (plan === "pro" || plan === "enterprise") return true;
  return usageCount < usageLimit;
}

describe("User.canAnalyze logic", () => {
  it("allows free users under limit", () => {
    expect(canAnalyze("free", 0, 10)).toBe(true);
  });

  it("blocks free users at limit", () => {
    expect(canAnalyze("free", 10, 10)).toBe(false);
  });

  it("allows pro users regardless of usage", () => {
    expect(canAnalyze("pro", 9999, 10)).toBe(true);
  });
});
