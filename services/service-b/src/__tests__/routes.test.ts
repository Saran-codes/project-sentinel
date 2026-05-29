import request from "supertest";
import { app, poll, resetConsecutiveFailures } from "../app";

afterEach(() => {
  resetConsecutiveFailures();
  jest.restoreAllMocks();
});

describe("GET /health", () => {
  it("returns 200 with status ok by default", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns 503 after 3 consecutive poll failures", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("connection refused"));

    await poll();
    await poll();
    await poll();

    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "degraded" });
  });

  it("recovers to ok after a successful poll", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("connection refused"));
    await poll();
    await poll();
    await poll();

    jest.restoreAllMocks();
    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ utc: new Date().toISOString() }),
      } as unknown as Response)
      .mockResolvedValueOnce({ ok: true } as unknown as Response);

    await poll();

    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
