# Services

Three Node.js/TypeScript microservices forming a time-conversion pipeline. All run with `tsx` in dev and compile to CommonJS for production. Logs are appended to `services/logs/<service-name>.log`.

---

## Data Flow

```
service-b (orchestrator)
  └─► GET service-a:3001/time          → { utc: "<ISO string>" }
  └─► convert UTC → 4 US timezones
  └─► POST service-c:3003/time         → persisted to time_records table
```

This cycle repeats every `POLL_INTERVAL_MS` (top-level constant in `service-b/src/app.ts`, currently `10000` ms). It is intentionally a constant, not an env var — change it directly in source.

---

## service-a — Time Source

**Port:** `3001`  
**Entry:** `services/service-a/src/index.ts`

| Route | Method | Response |
|---|---|---|
| `/time` | GET | `{ utc: string }` — current time as ISO 8601 string |
| `/health` | GET | `{ status: "ok" }` — always 200, no degradation logic |

**Types (`types.ts`):**
```ts
type TimeResponse  = { utc: string };
type HealthResponse = { status: "ok" | "degraded" };
```

**Notes:**
- Stateless — no DB access, no external deps.
- `/health` is hardcoded to `ok`; it never degrades on its own.

---

## service-b — Orchestrator / Converter

**Port:** `3002`  
**Entry:** `services/service-b/src/index.ts`

| Route | Method | Response |
|---|---|---|
| `/health` | GET | `{ status: "ok" }` (200) or `{ status: "degraded" }` (503) |

**No other HTTP routes** — service-b is driven entirely by its internal poll loop.

**Degradation logic:**
- A module-level counter `consecutiveFailures` increments on every failed poll tick.
- Failure is defined as: service-a fetch throws, service-a responds non-2xx, or service-c responds non-2xx.
- Threshold: `FAILURE_THRESHOLD = 3`. Once hit, `/health` returns `503 degraded`.
- Counter resets to `0` on any successful poll (both fetches succeed with 2xx).

**Timezone conversion (`toZonedISOString`):**
Uses `Intl.DateTimeFormat` with `timeZone` option to produce local ISO strings without offset (e.g. `2026-05-29T10:31:11`). Zones: `America/New_York`, `America/Chicago`, `America/Denver`, `America/Los_Angeles`.

**Types (`types.ts`):**
```ts
type TimeResponse   = { utc: string };
type ConvertedTime  = { utc: string; us_eastern: string; us_central: string; us_mountain: string; us_pacific: string };
type HealthResponse = { status: "ok" | "degraded" };
```

**Tests (`__tests__/routes.test.ts`):**
- `GET /health` returns 200/ok by default.
- Degrades to 503 after 3 consecutive fetch errors.
- Degrades on service-a non-2xx (res.ok = false).
- Degrades on service-c non-2xx even when service-a is healthy.
- Recovers to 200/ok after a single successful poll.

> **Critical:** Both `res.ok` checks in `poll()` (for service-a and service-c) must remain. Removing either breaks failure counting and causes test failures.

---

## service-c — Persistence

**Port:** `3003`  
**Entry:** `services/service-c/src/index.ts`

| Route | Method | Body | Response |
|---|---|---|---|
| `/time` | POST | `ConvertedTime` JSON | `{ stored: true }` (201) |
| `/health` | GET | — | `{ status: "ok" }` (200) or `{ status: "degraded" }` (503) |

**DB access (`src/db/index.ts`):**
- Opens `db/sentinel.db` via `node:sqlite` (`DatabaseSync`), lazily on first POST.
- `PRAGMA journal_mode = WAL` applied on open.
- Prepares a single `INSERT INTO time_records` statement, reused for all requests.

**Types (`types.ts`):**
```ts
type ConvertedTime  = { utc: string; us_eastern: string; us_central: string; us_mountain: string; us_pacific: string };
type HealthResponse = { status: "ok" | "degraded" };
```

**Notes:**
- `/health` on service-c reflects the Express app status only — it does not validate DB connectivity.
- service-c never initiates outbound requests; it is purely a write endpoint.
