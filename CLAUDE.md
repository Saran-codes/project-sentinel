# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project Sentinel** — a mock production environment consisting of three Node.js/TypeScript microservices backed by a SQLite database, plus a health poller that monitors service availability.

## Monorepo Structure

```
project_sentinel/
├── services/
│   ├── service-a/       # Returns current UTC time
│   ├── service-b/       # Fetches from A, converts to US time, forwards to C
│   ├── service-c/       # Receives time from B and persists it to SQLite
│   └── logs/            # Shared log output directory for all services
├── health-poller/       # Polls /health endpoints and records results
├── app/                 # Dashboard UI — service status, incidents, resolutions
├── scripts/
│   └── chaos-monkey/    # Randomly mutates service code to simulate failures
├── db/                  # Shared SQLite schema and migrations
├── package.json         # Workspace root (npm workspaces)
└── tsconfig.base.json   # Shared TS config extended by each package
```

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Database**: SQLite (via `better-sqlite3`)
- **HTTP**: Express (or similar) for service endpoints
- **Health poller**: Standalone process, polls each service's `/health` endpoint on an interval

## Commands

> Fill in once scripts are wired up.

```bash
# Install all workspace dependencies
npm install

# Build all packages
npm run build --workspaces

# Run a single service (example)
npm run dev --workspace=services/service-a

# Run the health poller
npm run dev --workspace=health-poller

# Run tests across all packages
npm test --workspaces
```

## Components

### Services (`/services`)

Three Node.js/TypeScript microservices that form a simple data pipeline. Each exposes HTTP endpoints and a `GET /health` route. Logs are written to `/services/logs`.

| Service | Responsibility |
|---|---|
| **service-a** | Exposes `GET /time` — returns the current UTC time |
| **service-b** | On a configurable interval `POLL_INTERVAL_MS`, calls service-a's `/time`, converts to US timezones, then POSTs to service-c |
| **service-c** | Receives the converted time from service-b and persists it to the SQLite DB |

**Data flow (repeating every `POLL_INTERVAL_MS`):** `service-b` → `GET service-a/time` → convert → `POST service-c/time` → SQLite

`POLL_INTERVAL_MS` is defined as a top-level constant in service-b's source — not an env var — so it is easy to find and adjust.

Each service has basic tests covering its core route(s) and the `/health` endpoint.

### Health Poller (`/health-poller`)
Standalone process that polls each service's `/health` endpoint on a fixed interval and writes results to SQLite. Acts as the source of truth for incident detection.

### Chaos Monkey (`/scripts/chaos-monkey`)
A script that randomly mutates service source code to simulate real-world failures. Implementation details TBD — will be discussed separately. Should be runnable on demand and must be easily reversible (e.g. via git restore).

### Dashboard UI (`/app`)
Frontend that reads from the SQLite DB and displays:
- Current status of each service (up / degraded / down)
- Active incidents with descriptions
- Past incidents with resolution notes and timelines

### Database (`/db`)
Shared SQLite DB (`db/sentinel.db`). Schema in `db/schema.sql`. Both the health poller and the dashboard read/write here.

---

## Key Conventions

- Each service exposes a `GET /health` endpoint returning `{ status: "ok" }` (200) or `{ status: "degraded" }` (503).
- All packages extend `tsconfig.base.json` at the root; do not duplicate compiler options.
- SQLite database file lives at `db/sentinel.db` and is git-ignored; schema is in `db/schema.sql`.
- The health poller writes poll results to the shared SQLite DB so history is queryable.

---

## Do Not Change

### TypeScript Strictness

All packages must extend `tsconfig.base.json` with these flags — do not relax them:

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

### Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `health-poller.ts` |
| Classes & interfaces | `PascalCase` | `HealthResult` |
| Functions & variables | `camelCase` | `pollServices()` |
| Constants / env values | `SCREAMING_SNAKE_CASE` | `POLL_INTERVAL_MS` |

### Type Discipline

- No `any` — use `unknown` and narrow explicitly.
- Prefer `type` over `interface` for plain data shapes; use `interface` only when declaration merging or extension is needed.
- No `I`-prefix on interfaces (`UserService`, not `IUserService`).
- Export types with `export type { ... }` to keep runtime imports clean.

### Module Structure (per service)

```
src/
├── index.ts       # Entry point — starts the server
├── routes/        # Express route handlers
├── db/            # DB access layer
└── types.ts       # Types local to this service
```
