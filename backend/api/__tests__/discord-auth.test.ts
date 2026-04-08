import handler from "../discord-auth";

const mockReq = (code?: string) =>
  ({
    query: code ? { code } : {},
  }) as any;

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("discord-auth API", () => {
  it("returns 400 if code is missing", async () => {
    const req = mockReq();
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing code" });
  });

  it("returns 500 if OAuth fails", async () => {
    const req = mockReq("badcode");
    const res = mockRes();
    // Patch oauth.tokenRequest to throw
    const orig = require("discord-oauth2").prototype.tokenRequest;
    require("discord-oauth2").prototype.tokenRequest = jest.fn(() => {
      throw new Error("fail");
    });
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "OAuth failed" });
    require("discord-oauth2").prototype.tokenRequest = orig;
  });
});
