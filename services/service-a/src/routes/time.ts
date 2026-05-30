import { Router } from "express";
import type { TimeResponse } from "../types";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ utc: new Date().toISOString() });
});

export { router as timeRouter };
