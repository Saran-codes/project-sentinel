import { DatabaseSync } from "node:sqlite";
import express from "express";
import path from "node:path";

const PORT = 3004;
const DB_PATH = path.resolve(__dirname, "../../db/sentinel.db");
const KNOWN_SERVICES = ["service-a", "service-b", "service-c"] as const;

type DisplayStatus = "ok" | "critical" | "investigating" | "recovery_in_process" | "unknown";

type HealthRow = { service: string; status: string; checked_at: string };
type IncidentRow = {
  id: number;
  service: string;
  status: string;
  title: string;
  report: string;
  severity: string;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
};
type ServiceStatusResponse = { name: string; status: DisplayStatus; checkedAt: string | null };
type IncidentResponse = {
  id: number;
  service: string;
  status: string;
  title: string;
  report: string;
  severity: string;
  createdBy: string;
  createdAt: string;
  resolvedAt: string | null;
};

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS health_checks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        service    TEXT NOT NULL,
        status     TEXT NOT NULL,
        checked_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        service      TEXT NOT NULL,
        status       TEXT NOT NULL,
        title        TEXT NOT NULL,
        report       TEXT NOT NULL,
        severity     TEXT NOT NULL,
        created_by   TEXT NOT NULL,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        resolved_at  TEXT
      )
    `);
  }
  return db;
}

function deriveStatus(
  healthStatus: string | undefined,
  openIncident: IncidentRow | undefined,
): DisplayStatus {
  if (openIncident !== undefined) {
    const s = openIncident.status;
    if (s === "investigating" || s === "recovery_in_process") return s;
  }
  if (healthStatus === undefined) return "unknown";
  return healthStatus === "ok" ? "ok" : "critical";
}

function toIncidentResponse(row: IncidentRow): IncidentResponse {
  return {
    id: row.id,
    service: row.service,
    status: row.status,
    title: row.title,
    report: row.report,
    severity: row.severity,
    createdBy: row.created_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

const app = express();

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/services", (_req, res) => {
  const database = getDb();

  const healthRows = database
    .prepare(
      "SELECT service, status, checked_at FROM health_checks WHERE id IN (SELECT MAX(id) FROM health_checks GROUP BY service)",
    )
    .all() as HealthRow[];

  const openIncidents = database
    .prepare("SELECT * FROM incidents WHERE status != 'resolved'")
    .all() as IncidentRow[];

  const healthMap = new Map<string, HealthRow>();
  for (const row of healthRows) {
    healthMap.set(row.service, row);
  }

  const incidentMap = new Map<string, IncidentRow>();
  for (const incident of openIncidents) {
    incidentMap.set(incident.service, incident);
  }

  const result: ServiceStatusResponse[] = KNOWN_SERVICES.map((name) => {
    const health = healthMap.get(name);
    const incident = incidentMap.get(name);
    return {
      name,
      status: deriveStatus(health?.status, incident),
      checkedAt: health?.checked_at ?? null,
    };
  });

  res.json(result);
});

app.get("/api/incidents/active", (_req, res) => {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM incidents WHERE status != 'resolved' ORDER BY created_at DESC")
    .all() as IncidentRow[];
  res.json(rows.map(toIncidentResponse));
});

app.get("/api/incidents/past", (_req, res) => {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM incidents WHERE status = 'resolved' ORDER BY created_at DESC")
    .all() as IncidentRow[];
  res.json(rows.map(toIncidentResponse));
});

app.listen(PORT, () => {
  console.log(`[sentinel-api] listening on http://localhost:${PORT}`);
});
