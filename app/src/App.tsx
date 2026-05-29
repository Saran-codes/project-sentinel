import { useEffect, useState } from "react";
import type { ServiceStatus, Incident } from "./types";
import { ServiceCard } from "./components/ServiceCard";
import { ActiveIncidents } from "./components/ActiveIncidents";
import { PastIncidents } from "./components/PastIncidents";

const POLL_MS = 5000;

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export function App() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [pastIncidents, setPastIncidents] = useState<Incident[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAll(): Promise<void> {
      try {
        const [svcs, active, past] = await Promise.all([
          apiFetch<ServiceStatus[]>("/api/services"),
          apiFetch<Incident[]>("/api/incidents/active"),
          apiFetch<Incident[]>("/api/incidents/past"),
        ]);
        setServices(svcs);
        setActiveIncidents(active);
        setPastIncidents(past);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    void fetchAll();
    const id = setInterval(() => { void fetchAll(); }, POLL_MS);
    return () => { clearInterval(id); };
  }, []);

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "44px 48px 80px",
        minHeight: "100vh",
      }}
    >
      {/* ─── Header ─── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 56,
          paddingBottom: 22,
          borderBottom: "1px solid #0d1e33",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: 21,
              letterSpacing: 4,
              color: "#c5d5e8",
              userSelect: "none",
            }}
          >
            SENTINEL
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              className="blink"
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#0dba8a",
                boxShadow: "0 0 7px #0dba8a",
              }}
            />
            <span
              style={{
                color: "#1f8b5e",
                fontSize: 12,
                letterSpacing: 2,
                fontWeight: 600,
              }}
            >
              LIVE
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {error != null && (
            <span
              style={{
                color: "#ff4040",
                fontSize: 13,
                background: "#ff404012",
                border: "1px solid #ff404030",
                padding: "3px 10px",
                borderRadius: 3,
              }}
            >
              ⚠ {error}
            </span>
          )}
          <span style={{ color: "#4d6885", fontSize: 13 }}>
            {lastUpdated != null
              ? `↻ ${lastUpdated.toLocaleTimeString()}`
              : "connecting…"}
          </span>
        </div>
      </header>

      {/* ─── Infrastructure ─── */}
      <section style={{ marginBottom: 56 }}>
        <SectionLabel label="INFRASTRUCTURE" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
            marginTop: 22,
          }}
        >
          {services.length === 0 ? (
            <div style={{ color: "#4d6885", fontSize: 13 }}>Loading services…</div>
          ) : (
            services.map((svc) => <ServiceCard key={svc.name} service={svc} />)
          )}
        </div>
      </section>

      {/* ─── Active Incidents ─── */}
      <section style={{ marginBottom: 56 }}>
        <SectionLabel
          label="ACTIVE INCIDENTS"
          count={activeIncidents.length}
          accentColor="#ff9d00"
        />
        <div style={{ marginTop: 22 }}>
          <ActiveIncidents incidents={activeIncidents} />
        </div>
      </section>

      {/* ─── Incident History ─── */}
      <section>
        <SectionLabel
          label="INCIDENT HISTORY"
          count={pastIncidents.length}
          accentColor="#0dba8a"
        />
        <div style={{ marginTop: 22 }}>
          <PastIncidents incidents={pastIncidents} />
        </div>
      </section>
    </div>
  );
}

type SectionLabelProps = {
  label: string;
  count?: number;
  accentColor?: string;
};

function SectionLabel({ label, count, accentColor }: SectionLabelProps) {
  const accent = accentColor ?? "#3d5270";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: 3,
          color: "#5a7393",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontSize: 12,
            color: accent,
            background: `${accent}18`,
            border: `1px solid ${accent}30`,
            padding: "1px 8px",
            borderRadius: 10,
            fontWeight: 600,
          }}
        >
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: 1, background: "#0d1e33" }} />
    </div>
  );
}
