import { Request, Response } from "express";
import { walletRiskResources } from "../../controllers/walletResourcesController";

describe("walletRiskResources", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { query: {} };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  it("returns base revoke.cash URLs when address is omitted (no dangling chain path)", () => {
    mockReq.query = { chainId: "1" };
    walletRiskResources(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          chainId: 1,
          address: null,
          revokeCash: "https://revoke.cash/ethereum/",
          explorerApprovalScanner: "https://etherscan.io/tokenapprovalchecker",
          walletPortfolioAggregator: "https://debank.com/",
        }),
      }),
    );
  });

  it("embeds checksum address in links when provided", () => {
    const addr = "0xd8da6bf26964af9d7eed9e03e53415dd37aa60fb";
    const checksumAddr = "0xd8Da6bf26964Af9D7eED9e03E53415dd37AA60FB";
    mockReq.query = { chainId: "1", address: addr };

    walletRiskResources(mockReq as Request, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          address: checksumAddr,
          revokeCash: `https://revoke.cash/ethereum/${checksumAddr}`,
          explorerApprovalScanner: expect.stringContaining("tokenapprovalchecker"),
        }),
      }),
    );
  });

  it("returns 400 for unsupported chainId", () => {
    mockReq.query = { chainId: "999999" };

    walletRiskResources(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "BAD_CHAIN" }),
      }),
    );
  });
});
