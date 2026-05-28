CREATE TABLE IF NOT EXISTS time_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  utc         TEXT NOT NULL,
  us_eastern  TEXT NOT NULL,
  us_central  TEXT NOT NULL,
  us_mountain TEXT NOT NULL,
  us_pacific  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS health_checks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  service    TEXT NOT NULL,
  status     TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
