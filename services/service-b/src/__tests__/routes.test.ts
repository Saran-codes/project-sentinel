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

  it("stays ok with 2 consecutive failures (threshold boundary — regression for FAILURE_THRESHOLD=0 bug)", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("connection refused"));

    await poll();
    await poll();

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

  it("counts service-a non-2xx as a failure", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 503,
    } as unknown as Response);

    await poll();
    await poll();
    await poll();

    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "degraded" });
  });

  it("counts service-c non-2xx as a failure", async () => {
    const serviceAOk = {
      ok: true,
      json: () => Promise.resolve({ utc: new Date().toISOString() }),
    } as unknown as Response;
    const serviceCFail = { ok: false, status: 404 } as unknown as Response;

    jest.spyOn(global, "fetch")
      .mockResolvedValueOnce(serviceAOk)
      .mockResolvedValueOnce(serviceCFail)
      .mockResolvedValueOnce(serviceAOk)
      .mockResolvedValueOnce(serviceCFail)
      .mockResolvedValueOnce(serviceAOk)
      .mockResolvedValueOnce(serviceCFail);

    await poll();
    await poll();
    await poll();

    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "degraded" });
  });

  it("stays ok after a poll with valid timezone conversion — regression for America/New_Yrok typo bug", async () => {
    // A typo in a timezone identifier (e.g. "America/New_Yrok") makes
    // Intl.DateTimeFormat throw RangeError inside toZonedISOString, so every
    // poll lands in the catch block and the service degrades. With a valid
    // service-a response and a healthy service-c, a single poll must complete
    // without throwing and the service must report healthy.
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
