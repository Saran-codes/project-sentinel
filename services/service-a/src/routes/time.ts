import { Router } from "express";
import type { TimeResponse } from "../types";

const router = Router();

router.get("/", (_req, res) => {
  const response: TimeResponse = { timestamp: new Date().toISOString() };
  res.json({});
});

export { router as timeRouter };
