import express from "express";
import { log } from "./logger";
import type { ConvertedTime, HealthResponse, TimeResponse } from "./types";

const SERVICE_A_URL = "http://localhost:3099";
const SERVICE_C_URL = "http://localhost:3003";
const FAILURE_THRESHOLD = 3;

let consecutiveFailures = 0;

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  const status: HealthResponse["status"] =
    consecutiveFailures >= FAILURE_THRESHOLD ? "degraded" : "ok";
  const response: HealthResponse = { status };
  res.status(status === "ok" ? 200 : 503).json(response);
});

function toZonedISOString(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

export async function poll(): Promise<void> {
  try {
    const res = await fetch(`${SERVICE_A_URL}/time`);
    if (!res.ok) {
      throw new Error(`service-a responded ${res.status}`);
    }
    const { utc } = (await res.json()) as TimeResponse;

    const date = new Date(utc);
    const payload: ConvertedTime = {
      utc,
      us_eastern: toZonedISOString(date, "America/New_York"),
      us_central: toZonedISOString(date, "America/Chicago"),
      us_mountain: toZonedISOString(date, "America/Denver"),
      us_pacific: toZonedISOString(date, "America/Los_Angeles"),
    };

    const cRes = await fetch(`${SERVICE_C_URL}/time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!cRes.ok) {
      throw new Error(`service-c responded ${cRes.status}`);
    }

    consecutiveFailures = 0;
    log(`[poll] stored time: ${utc}`);
  } catch (err) {
    consecutiveFailures++;
    log(`[poll] error (consecutive failures: ${consecutiveFailures}): ${String(err)}`);
  }
}

export function resetConsecutiveFailures(): void {
  consecutiveFailures = 0;
}

export { app };
