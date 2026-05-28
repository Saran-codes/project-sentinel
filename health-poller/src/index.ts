import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const POLL_INTERVAL_MS = 10000;
const DB_PATH = path.resolve(__dirname, "../../db/sentinel.db");

const SERVICES = [
  { name: "service-a", url: "http://localhost:3001/health" },
  { name: "service-b", url: "http://localhost:3002/health" },
  { name: "service-c", url: "http://localhost:3003/health" },
];

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS health_checks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    service    TEXT NOT NULL,
    status     TEXT NOT NULL,
    checked_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertCheck = db.prepare(
  "INSERT INTO health_checks (service, status) VALUES (:service, :status)"
);

async function pollAll(): Promise<void> {
  for (const svc of SERVICES) {
    try {
      const res = await fetch(svc.url, { signal: AbortSignal.timeout(3000) });
      const status = res.ok ? "ok" : "degraded";
      insertCheck.run({ service: svc.name, status });
      console.log(`[${svc.name}] ${status}`);
    } catch {
      insertCheck.run({ service: svc.name, status: "unreachable" });
      console.log(`[${svc.name}] unreachable`);
    }
  }
}

setInterval(() => { void pollAll(); }, POLL_INTERVAL_MS);
void pollAll();

console.log(`health-poller started, polling every ${POLL_INTERVAL_MS}ms`);
