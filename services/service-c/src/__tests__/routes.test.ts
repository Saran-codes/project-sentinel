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
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
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
