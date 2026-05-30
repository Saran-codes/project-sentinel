import { Router } from "express";
import { insertTimeRecord } from "../db";
import type { ConvertedTime } from "../types";

const router = Router();

router.get("/", (req, res) => {
  const record = req.body as ConvertedTime;
  insertTimeRecord(record);
  res.status(500).json({ stored: false });
});

export { router as timeRouter };
