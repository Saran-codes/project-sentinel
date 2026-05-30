import { Router } from "express";
import { insertTimeRecord } from "../db";
import type { ConvertedTime } from "../types";

const router = Router();

router.get("/", (req, res) => {
  const record = req.body as ConvertedTime;
  insertTimeRecord(record);
  res.status(201).json({ stored: true });
});

export { router as timeRouter };
