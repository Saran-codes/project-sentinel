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
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e2e8f0",
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        padding: "32px 40px",
        boxSizing: "border-box",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 40 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>
          Project Sentinel
        </h1>
        <span style={{ color: "#475569", fontSize: 12 }}>
          {lastUpdated ? `updated ${lastUpdated.toLocaleTimeString()}` : "connecting…"}
        </span>
        {error && (
          <span style={{ color: "#ef4444", fontSize: 12, marginLeft: "auto" }}>
            ⚠ {error}
          </span>
        )}
      </header>

      <section style={{ marginBottom: 48 }}>
        <SectionHeader label="Service Status" />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {services.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 14 }}>Loading…</div>
          ) : (
            services.map((svc) => <ServiceCard key={svc.name} service={svc} />)
          )}
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <SectionHeader
          label="Active Incidents"
          count={activeIncidents.length}
          countColor="#f59e0b"
        />
        <ActiveIncidents incidents={activeIncidents} />
      </section>

      <section>
        <SectionHeader
          label="Past Incidents"
          count={pastIncidents.length}
          countColor="#10b981"
        />
        <PastIncidents incidents={pastIncidents} />
      </section>
    </div>
  );
}

type SectionHeaderProps = {
  label: string;
  count?: number;
  countColor?: string;
};

function SectionHeader({ label, count, countColor }: SectionHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
        paddingBottom: 10,
        borderBottom: "1px solid #1e293b",
      }}
    >
      <span style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>
        {label.toUpperCase()}
      </span>
      {count !== undefined && (
        <span
          style={{
            background: `${countColor ?? "#64748b"}22`,
            border: `1px solid ${countColor ?? "#64748b"}44`,
            color: countColor ?? "#64748b",
            fontSize: 11,
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: 10,
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}
