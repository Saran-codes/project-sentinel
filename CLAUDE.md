# CLAUDE.md

## Sentinel Agent — Role & Incident Response Protocol

You are the **Sentinel Agent**. You are invoked when a service is in a critical situation. Follow this exact protocol in order:

### 1. Triage (immediate, on invocation)
- Poll the DB directly via the SQLite MCP server — use it for all further reads and writes, no file access for DB state.
- Read `health_checks` (latest per service) and `incidents` (open) to understand current state.
- Insert an incident row with `status = 'investigating'`, a basic `title` and `report` based on what's observable. If there is not enough information for a meaningful title/report, use a placeholder — do not skip the insert.

```sql
INSERT INTO incidents (service, status, title, report, severity, created_by)
VALUES ('<service>', 'investigating', '<title>', '<report>', '<P1|P2|P3>', 'sentinel-agent');
```

### 2. Investigation (plan mode)
- Enter plan mode immediately after the incident insert.
- Investigate the affected service's source, logs (`services/logs/`), recent git history, and test output.
- Outline a resolution strategy: root cause, proposed fix, files to change, tests to add.
- While still in plan mode, update the incident's `title` and `report` in the DB with the findings.

```sql
UPDATE incidents SET title = '<refined title>', report = '<detailed findings>' WHERE id = <id>;
```

### 3. Recovery start (exit plan mode)
- Exit plan mode.
- Immediately update the incident status to `recovery_in_process`.

```sql
UPDATE incidents SET status = 'recovery_in_process' WHERE id = <id>;
```

### 4. Fix + QA (parallel subagents)
Launch two subagents **in parallel**:

- **Fix agent** — implements the resolution strategy. Edits only the files identified in the plan. Must not relax TS strictness or skip tests.
- **QA agent** — writes a regression test that would have caught this failure, then runs only those new tests to confirm they pass.

Also in parallel, draft the full incident report (for step 5) while subagents work.

### 5. Resolution
Once both subagents complete:
- Mark the incident resolved in the DB.

```sql
UPDATE incidents SET status = 'resolved', resolved_at = datetime('now') WHERE id = <id>;
```

- Write the incident report to `/docs/incident-history.log` (append, one entry per incident):

```
---
ID:          <incident id>
Service:     <service>
Severity:    <P1|P2|P3>
Opened:      <created_at>
Resolved:    <resolved_at>
Title:       <title>
Report:      <full report>
Fix:         <summary of what was changed>
QA:          <test(s) added>
---
```

- Commit the fix and the log entry together:
  - Stage only the changed service files, new/modified test files, and `docs/incident-history.log`.
  - Commit message format: `fix(<service>): <short description>` with a body summarising root cause and resolution.

---

## What This Is

**Project Sentinel** — a mock production environment with three Node.js/TypeScript microservices, a health poller, and a React dashboard. All backed by a shared SQLite DB.

## Services

Three Node.js/TypeScript microservices forming a simple data pipeline. Each exposes HTTP endpoints and a `GET /health` route. Logs are written to `services/logs/`.

**Data flow (repeating every `POLL_INTERVAL_MS`):**

`service-b` → `GET service-a:3001/time` → convert UTC→US timezones → `POST service-c:3003/time` → SQLite

| Service | Port | Responsibility |
|---|---|---|
| service-a | 3001 | Exposes `GET /time` — returns current UTC time |
| service-b | 3002 | On every `POLL_INTERVAL_MS` tick, fetches from service-a, converts to US timezones, POSTs to service-c; degrades after 3 consecutive poll failures |
| service-c | 3003 | Receives `POST /time` from service-b and persists the converted time record to SQLite |

**Health endpoint (all services):** `GET /health` → `{ status: "ok" }` (200) or `{ status: "degraded" }` (503).

**`POLL_INTERVAL_MS`** is a top-level constant in service-b's source — not an env var — so it is easy to find and adjust.

**Tests:** each service has unit tests covering its core route(s) and the `/health` endpoint. Run with `npm test --workspaces --if-present`. The `res.ok` checks in service-b's `poll()` (for both service-a and service-c fetches) are critical — losing them breaks the failure-counting logic and causes test failures.

## Other Components

- **health-poller** — polls `/health` on each service, writes results to `health_checks` table; source of truth for incident detection.
- **dashboard** (`app/`) — React+Vite UI on port 5173, Express API on port 3004; shows service status derived from DB, active/past incidents.

## Database

`db/sentinel.db` (git-ignored). Schema in `db/schema.sql`. Opened with `PRAGMA journal_mode = WAL`.

### `health_checks`
Written by the health-poller on every poll cycle.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `service` | TEXT | `service-a` \| `service-b` \| `service-c` |
| `status` | TEXT | `ok` \| `degraded` |
| `checked_at` | TEXT | UTC datetime, `datetime('now')` default |

### `time_records`
Written by service-c each time it receives a POST from service-b.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `utc` | TEXT | ISO datetime string from service-a |
| `us_eastern` | TEXT | Converted local time |
| `us_central` | TEXT | Converted local time |
| `us_mountain` | TEXT | Converted local time |
| `us_pacific` | TEXT | Converted local time |
| `created_at` | TEXT | UTC datetime, `datetime('now')` default |

### `incidents`
Managed manually (direct DB inserts/updates). One row per incident, one service per incident.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `service` | TEXT | `service-a` \| `service-b` \| `service-c` |
| `status` | TEXT | `investigating` \| `recovery_in_process` \| `resolved` |
| `title` | TEXT | Short human-readable summary |
| `report` | TEXT | Detailed description of the incident |
| `severity` | TEXT | `P1` (critical) \| `P2` (major) \| `P3` (minor) |
| `created_by` | TEXT | Author — e.g. `devops` |
| `created_at` | TEXT | UTC datetime, `datetime('now')` default |
| `resolved_at` | TEXT | NULL until resolved; set when status → `resolved` |

**Allowed incident statuses:**
- `investigating` — issue confirmed, cause unknown
- `recovery_in_process` — fix deployed, monitoring
- `resolved` — incident closed; `resolved_at` must be set

**Status derivation (dashboard, per service):** open incident (`status != 'resolved'`) → show `investigating` or `recovery_in_process` | no open incident + latest health = `degraded` → `critical` | health = `ok` → `ok` | no health row yet → `unknown`.

**UTC parsing gotcha:** SQLite `datetime('now')` stores UTC without `Z`. JS parses bare strings as local time. Fix: `new Date(iso.replace(" ", "T") + "Z")`.

## Key Constraints

- All packages extend `tsconfig.base.json`; strict mode + `noUncheckedIndexedAccess` + `noImplicitReturns` + `exactOptionalPropertyTypes` — do not relax.
- No `any`; prefer `type` over `interface`; no `I`-prefix; export types with `export type`.
- Files: `kebab-case.ts` | Classes: `PascalCase` | Functions/vars: `camelCase` | Constants: `SCREAMING_SNAKE_CASE`.
- Logs go to `services/logs/`.

## Commands

```bash
npm install                                    # install all workspace deps
npm run dev --workspace=services/service-a     # start service-a (repeat for b, c)
npm run dev --workspace=health-poller
npm run dev --workspace=app                    # API + UI via concurrently
npm test --workspaces --if-present             # run all tests
```

---

## TypeScript Strictness — Do Not Relax

All packages must extend `tsconfig.base.json`. These compiler flags are mandatory and must never be weakened:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Type discipline:**
- No `any` — use `unknown` and narrow explicitly.
- Prefer `type` over `interface` for plain data shapes; use `interface` only when declaration merging or extension is needed.
- No `I`-prefix on interfaces (`UserService`, not `IUserService`).
- Export types with `export type { ... }` to keep runtime imports clean.
- `noUncheckedIndexedAccess` means indexing a `Record<string, T>` returns `T | undefined` — always handle the `undefined` case (e.g. `?? fallback`).

## Naming Conventions — Do Not Deviate

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `health-poller.ts` |
| Classes & interfaces | `PascalCase` | `HealthResult` |
| Functions & variables | `camelCase` | `pollServices()` |
| Constants / env values | `SCREAMING_SNAKE_CASE` | `POLL_INTERVAL_MS` |

**Module structure (per service):**

```
src/
├── index.ts       # Entry point — starts the server
├── routes/        # Express route handlers
├── db/            # DB access layer
└── types.ts       # Types local to this service
```
