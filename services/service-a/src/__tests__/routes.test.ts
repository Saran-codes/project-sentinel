import request from "supertest";
import { app } from "../app";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("GET /time", () => {
  it("returns 200 with a valid UTC ISO string", async () => {
    const res = await request(app).get("/time");
    expect(res.status).toBe(200);
    expect(typeof res.body.utc).toBe("string");
    expect(new Date(res.body.utc as string).toISOString()).toBe(res.body.utc as string);
  });
});
