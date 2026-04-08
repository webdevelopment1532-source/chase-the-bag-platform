const axios = require("axios");
const { performance } = require("perf_hooks");

describe("API Performance", () => {
  const baseUrl = process.env.API_BASE_URL || "http://localhost:3000/api";
  const endpoints = ["/discord-auth", "/audit-log", "/exchange"];

  endpoints.forEach((ep) => {
    it(`should respond quickly: ${ep}`, async () => {
      const url = baseUrl + ep;
      const start = performance.now();
      try {
        await axios.get(url);
      } catch (e) {
        // Ignore errors for endpoints that require auth
      }
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(800); // ms
    });
  });

  it("handles 100 concurrent requests to /exchange", async () => {
    const url = baseUrl + "/exchange";
    const requests = Array.from({ length: 100 }, () =>
      axios.get(url).catch(() => {}),
    );
    const start = performance.now();
    await Promise.all(requests);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000); // 5s for 100 requests
  });
});
