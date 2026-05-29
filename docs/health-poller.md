# Health Poller

Standalone Node.js/TypeScript process that periodically polls each service's `/health` endpoint and writes the result to the `health_checks` table in SQLite. It is the system's source of truth for service availability and incident detection.

**Entry:** `health-poller/src/index.ts`  
**Run:** `npm run dev --workspace=health-poller`

---

## Behaviour

- Polls all three services every `POLL_INTERVAL_MS = 10000` ms (10 seconds).
- Also fires once immediately on startup (before the first interval tick).
- Each poll is a `fetch` to the service's `/health` URL with a 3-second timeout (`AbortSignal.timeout(3000)`).
- Results are written to `health_checks` via a prepared `INSERT` statement.

**Status written per poll:**

| Condition | `status` written |
|---|---|
| `res.ok` is true (2xx) | `ok` |
| Response received but non-2xx | `degraded` |
| Fetch throws (timeout, ECONNREFUSED, etc.) | `unreachable` |

---

## Services Polled

| Service | URL polled |
|---|---|
| service-a | `http://localhost:3001/health` |
| service-b | `http://localhost:3002/health` |
| service-c | `http://localhost:3003/health` |

---

## Database

Opens `db/sentinel.db` directly via `node:sqlite` (`DatabaseSync`) with `PRAGMA journal_mode = WAL`. Creates the `health_checks` table if it does not exist on startup.

**Write:**
```sql
INSERT INTO health_checks (service, status) VALUES (:service, :status);
-- checked_at defaults to datetime('now') (UTC)
```

---

## Logging

Each poll result is logged via `logger.ts` to `services/logs/health-poller.log` in the format:
```
[service-a] ok
[service-b] degraded
[service-c] unreachable
```

---

## Notes

- The poller does not modify incidents — it only writes raw health check rows.
- The dashboard (`app/server/index.ts`) reads the latest health row per service to derive display status.
- `unreachable` is written to the DB but is treated the same as `degraded` by the status derivation logic (anything other than `ok` → `critical`).
- If the poller is not running, `checkedAt` on the dashboard will show stale timestamps or "never checked".
