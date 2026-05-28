import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { ConvertedTime } from "../types";

const DB_PATH = path.resolve(__dirname, "../../../../db/sentinel.db");

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS time_records (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        utc         TEXT NOT NULL,
        us_eastern  TEXT NOT NULL,
        us_central  TEXT NOT NULL,
        us_mountain TEXT NOT NULL,
        us_pacific  TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

export function insertTimeRecord(record: ConvertedTime): void {
  const stmt = getDb().prepare(`
    INSERT INTO time_records (utc, us_eastern, us_central, us_mountain, us_pacific)
    VALUES (:utc, :us_eastern, :us_central, :us_mountain, :us_pacific)
  `);
  stmt.run(record as unknown as Record<string, string>);
}
