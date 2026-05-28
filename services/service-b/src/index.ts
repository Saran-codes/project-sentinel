import express from "express";
import type { ConvertedTime, HealthResponse, TimeResponse } from "./types";

const PORT = 3002;
const POLL_INTERVAL_MS = 5000;
const SERVICE_A_URL = "http://localhost:3001";
const SERVICE_C_URL = "http://localhost:3003";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  const response: HealthResponse = { status: "ok" };
  res.status(200).json(response);
});

function toZonedISOString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date).replace(", ", "T");
}

async function poll(): Promise<void> {
  try {
    const res = await fetch(`${SERVICE_A_URL}/time`);
    const { utc } = (await res.json()) as TimeResponse;

    const date = new Date(utc);
    const payload: ConvertedTime = {
      utc,
      us_eastern: toZonedISOString(date, "America/New_York"),
      us_central: toZonedISOString(date, "America/Chicago"),
      us_mountain: toZonedISOString(date, "America/Denver"),
      us_pacific: toZonedISOString(date, "America/Los_Angeles"),
    };

    await fetch(`${SERVICE_C_URL}/time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log(`[poll] stored time: ${utc}`);
  } catch (err) {
    console.error("[poll] error:", err);
  }
}

setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

app.listen(PORT, () => {
  console.log(`service-b listening on port ${PORT}, polling every ${POLL_INTERVAL_MS}ms`);
});
