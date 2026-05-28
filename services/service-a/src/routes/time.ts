import { Router } from "express";
import type { TimeResponse } from "../types";

const router = Router();

router.get("/", (_req, res) => {
  const response: TimeResponse = { utc: new Date().toISOString() };
  res.json(response);
});

export { router as timeRouter };
