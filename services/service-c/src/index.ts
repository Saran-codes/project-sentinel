import express from "express";
import { timeRouter } from "./routes/time";
import type { HealthResponse } from "./types";

const PORT = 3003;

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  const response: HealthResponse = { status: "ok" };
  res.status(200).json(response);
});

app.use("/time", timeRouter);

app.listen(PORT, () => {
  console.log(`service-c listening on port ${PORT}`);
});
