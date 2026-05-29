import request from "supertest";

jest.mock("../db", () => ({
  insertTimeRecord: jest.fn(),
}));

import { app } from "../app";
import { insertTimeRecord } from "../db";

const mockInsert = insertTimeRecord as jest.MockedFunction<typeof insertTimeRecord>;

afterEach(() => {
  mockInsert.mockClear();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.body).toEqual({ status: "ok" });
    // HTTP status must match body status: "ok" → 200
    expect(res.status).toBe(200);
  });

  // Regression guard: health endpoint must never be hardcoded to "degraded".
  // This catches a mutation where the handler always returns { status: "degraded" } / 503.
  it("returns status ok (not degraded) on a cold start — regression for hardcoded-degraded bug", async () => {
    const res = await request(app).get("/health");
    expect(res.status).not.toBe(503);
    expect(res.body.status).not.toBe("degraded");
  });

  // TODO: add a test for "returns 503 when health is degraded" once service-c
  // grows a degraded-state mechanism (e.g. a consecutiveFailures counter like
  // service-b). At that point, trigger the degraded state, call GET /health, and
  // assert res.status === 503 and res.body.status === "degraded".
  // Contract: status === "ok" → HTTP 200; status === "degraded" → HTTP 503.
});

describe("unknown routes", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/tiime");
    expect(res.status).toBe(404);
  });
});

describe("POST /time", () => {
  const body = {
    utc: "2024-01-15T10:00:00.000Z",
    us_eastern: "2024-01-15T05:00:00",
    us_central: "2024-01-15T04:00:00",
    us_mountain: "2024-01-15T03:00:00",
    us_pacific: "2024-01-15T02:00:00",
  };

  it("returns 201 and calls insertTimeRecord with the body", async () => {
    const res = await request(app).post("/time").send(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ stored: true });
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(body);
  });
});
