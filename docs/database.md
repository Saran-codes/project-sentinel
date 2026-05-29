# Database

**Engine:** SQLite via `node:sqlite` (Node.js built-in, available from Node 22+)  
**File:** `db/sentinel.db` — git-ignored, created on first run  
**Schema:** `db/schema.sql`  
**WAL mode:** all openers run `PRAGMA journal_mode = WAL` for concurrent read safety

---

## Tables

### `health_checks`

Written by the health-poller on every poll cycle. One row per service per tick.

```sql
CREATE TABLE IF NOT EXISTS health_checks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  service    TEXT NOT NULL,
  status     TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Values | Notes |
|---|---|---|
| `service` | `service-a` \| `service-b` \| `service-c` | |
| `status` | `ok` \| `degraded` \| `unreachable` | `unreachable` = fetch threw (timeout/ECONNREFUSED) |
| `checked_at` | UTC datetime string | No `Z` suffix — see UTC gotcha below |

**Query used by dashboard (latest per service):**
```sql
SELECT service, status, checked_at FROM health_checks
WHERE id IN (SELECT MAX(id) FROM health_checks GROUP BY service);
```

---

### `time_records`

Written by service-c each time it receives a `POST /time` from service-b.

```sql
CREATE TABLE IF NOT EXISTS time_records (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  utc         TEXT NOT NULL,
  us_eastern  TEXT NOT NULL,
  us_central  TEXT NOT NULL,
  us_mountain TEXT NOT NULL,
  us_pacific  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Example value | Notes |
|---|---|---|
| `utc` | `2026-05-29T10:31:11.000Z` | ISO 8601 from service-a |
| `us_eastern` | `2026-05-29T06:31:11` | Local time, no offset |
| `us_central` | `2026-05-29T05:31:11` | Local time, no offset |
| `us_mountain` | `2026-05-29T04:31:11` | Local time, no offset |
| `us_pacific` | `2026-05-29T03:31:11` | Local time, no offset |
| `created_at` | `2026-05-29 10:31:11` | UTC, no `Z`, SQLite default |

---

### `incidents`

Managed manually via direct SQL. One row per incident, one service per incident. The dashboard reads this table to overlay incident status on top of health check data.

```sql
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
);
```

| Column | Allowed values | Notes |
|---|---|---|
| `service` | `service-a` \| `service-b` \| `service-c` | |
| `status` | `investigating` \| `recovery_in_process` \| `resolved` | |
| `severity` | `P1` \| `P2` \| `P3` | P1 = critical, P2 = major, P3 = minor |
| `created_by` | free text | e.g. `devops`, `sentinel-agent` |
| `resolved_at` | UTC datetime or NULL | Must be set when status → `resolved` |

**Incident status meanings:**

| Status | Meaning |
|---|---|
| `investigating` | Issue confirmed, root cause unknown |
| `recovery_in_process` | Fix deployed, monitoring for stability |
| `resolved` | Incident closed; `resolved_at` set |

**Example — open an incident:**
```sql
INSERT INTO incidents (service, status, title, report, severity, created_by)
VALUES ('service-b', 'investigating', 'Poll loop failing', 'service-b health degraded after 3 consecutive failures to reach service-a', 'P2', 'sentinel-agent');
```

**Example — resolve:**
```sql
UPDATE incidents
SET status = 'resolved', resolved_at = datetime('now')
WHERE id = <id>;
```

---

## Status Derivation (Dashboard)

The dashboard computes a `DisplayStatus` per service by combining the latest health check with any open incident:

```
open incident exists (status != 'resolved')
  → use incident.status  ("investigating" | "recovery_in_process")

no open incident + latest health_check.status = 'ok'
  → "ok"

no open incident + latest health_check.status = 'degraded' | 'unreachable'
  → "critical"

no health_check row for this service
  → "unknown"
```

---

## UTC Parsing Gotcha

`datetime('now')` in SQLite stores UTC **without** a `Z` suffix (e.g. `2026-05-29 10:31:11`). JavaScript's `new Date("2026-05-29 10:31:11")` interprets this as **local time**, causing timestamps to be off by the local UTC offset (e.g. +5:30 IST = 5.5 hours wrong).

**Fix — always use this helper when parsing SQLite datetime strings in JS/TS:**
```ts
function parseUtc(iso: string): Date {
  return new Date(iso.replace(" ", "T") + "Z");
}
```

This is applied in all three dashboard components (`ServiceCard`, `ActiveIncidents`, `PastIncidents`).
