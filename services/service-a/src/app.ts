import express from "express";
import { timeRouter } from "./routes/time";
import type { HealthResponse } from "./types";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  const response: HealthResponse = { status: "ok" };
  res.status(response.status === "ok" ? 200 : 503).json(response);
});

app.use("/time", timeRouter);

export { app };
