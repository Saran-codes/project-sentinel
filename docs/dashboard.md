# Dashboard

React + Vite frontend for monitoring Sentinel's three services. Displays live service status, active incidents, and resolved incident history. Backed by a small Express API server that reads from the shared SQLite DB.

**UI:** `http://localhost:5173` (Vite dev server)  
**API:** `http://localhost:3004` (Express)  
**Run:** `npm run dev --workspace=app` (starts both via `concurrently`)

---

## Architecture

```
app/
├── server/
│   └── index.ts          # Express API — reads DB, serves /api/*
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Root component — polling loop, layout
│   ├── index.css          # Global styles, animations, status dot classes
│   └── components/
│       ├── ServiceCard.tsx      # Per-service status card
│       ├── ActiveIncidents.tsx  # Open incidents feed
│       └── PastIncidents.tsx    # Resolved incidents with expand/collapse
├── index.html
└── vite.config.ts         # Proxies /api → localhost:3004
```

Vite proxies all `/api` requests to the Express server, so the React app never hard-codes port 3004.

---

## API Endpoints (`server/index.ts`)

| Method | Path | Returns |
|---|---|---|
| GET | `/api/services` | `ServiceStatus[]` — derived status for all 3 services |
| GET | `/api/incidents/active` | `Incident[]` — `status != 'resolved'`, newest first |
| GET | `/api/incidents/past` | `Incident[]` — `status = 'resolved'`, newest first |

The server opens `db/sentinel.db` lazily on first request with `PRAGMA journal_mode = WAL`.

---

## Types (`src/types.ts`)

```ts
type DisplayStatus =
  | "ok"
  | "critical"
  | "investigating"
  | "recovery_in_process"
  | "unknown";

type ServiceStatus = {
  name: string;          // "service-a" | "service-b" | "service-c"
  status: DisplayStatus;
  checkedAt: string | null; // UTC datetime string from health_checks, or null
};

type Incident = {
  id: number;
  service: string;
  status: string;        // "investigating" | "recovery_in_process" | "resolved"
  title: string;
  report: string;
  severity: string;      // "P1" | "P2" | "P3"
  createdBy: string;
  createdAt: string;     // UTC datetime string
  resolvedAt: string | null;
};
```

---

## Components

### `App.tsx`
- Fetches `/api/services`, `/api/incidents/active`, `/api/incidents/past` in parallel every `5000` ms via `setInterval` + `useEffect`.
- Renders three sections: **INFRASTRUCTURE**, **ACTIVE INCIDENTS**, **INCIDENT HISTORY**.
- Header shows the SENTINEL wordmark, a blinking live dot, last-updated timestamp, and an error badge if any fetch fails.

### `ServiceCard.tsx`
- Renders a card per service with a coloured top border and animated status dot.
- Status → colour mapping:

| Status | Dot colour | Border colour |
|---|---|---|
| `ok` | `#0dba8a` (green) | `#0dba8a40` |
| `critical` | `#ff4040` (red) | `#ff404040` |
| `investigating` | `#ff9d00` (orange) | `#ff9d0040` |
| `recovery_in_process` | `#2689ff` (blue) | `#2689ff40` |
| `unknown` | `#4a5568` (grey) | `#4a556840` |

- `checkedAt` is formatted as `Xs ago` / `Xm ago` / `Xh Xm ago` using `parseUtc()`.

### `ActiveIncidents.tsx`
- Empty state: green dot + "All systems operational" message.
- Each incident card has a left border coloured by status, severity badge, service tag, title, report, and a footer with author + time.

### `PastIncidents.tsx`
- Each resolved incident is a row with title, timestamps, duration, and a **toggle button** to expand/collapse the full report.
- Expand/collapse state is local per row (`useState(false)` in `PastIncidentRow`).
- Expanded report animates in with `slide-down` CSS keyframe.

---

## Styling (`src/index.css`)

- **Background:** `#060c18` dark navy with a 40px CSS grid overlay and two radial gradient glows (blue top-left, green bottom-right) fixed to the viewport.
- **Font:** JetBrains Mono for all body text; Syne (700/800) for section headers and the SENTINEL wordmark.
- **Status dots:** CSS classes `status-dot--ok`, `status-dot--critical`, `status-dot--investigating`, `status-dot--recovery_in_process`, `status-dot--unknown` — each with a matching `pulse-ring-*` keyframe animation.
- **Report toggle:** `.report-toggle` / `.report-toggle.open` — subtle bordered button that brightens on hover/open.
- **Slide-down:** `.report-content` uses `slide-down` keyframe (`opacity 0 + translateY(-6px)` → visible) for expanded report reveal.

---

## UTC Parsing

All datetime strings from the API are SQLite UTC strings without a `Z` suffix. Every component uses:

```ts
function parseUtc(iso: string): Date {
  return new Date(iso.replace(" ", "T") + "Z");
}
```

Without this, JS interprets the string as local time, causing timestamps to appear hours in the past.
