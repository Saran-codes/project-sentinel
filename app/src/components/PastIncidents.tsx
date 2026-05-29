import type { Incident } from "../types";

const SEVERITY_COLOR: Record<string, string> = {
  P1: "#ef4444",
  P2: "#f59e0b",
  P3: "#3b82f6",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function severityColor(s: string): string {
  return SEVERITY_COLOR[s] ?? "#6b7280";
}

type Props = { incidents: Incident[] };

export function PastIncidents({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div style={{ color: "#475569", fontSize: 14, fontStyle: "italic" }}>
        No past incidents.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {incidents.map((inc) => (
        <div
          key={inc.id}
          style={{
            background: "#1e293b",
            border: "1px solid #1e293b",
            borderLeft: "3px solid #10b981",
            borderRadius: 8,
            padding: "14px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span
              style={{
                background: `${severityColor(inc.severity)}22`,
                border: `1px solid ${severityColor(inc.severity)}44`,
                color: severityColor(inc.severity),
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {inc.severity}
            </span>
            <span style={{ color: "#64748b", fontSize: 12 }}>{inc.service}</span>
            <span
              style={{
                marginLeft: "auto",
                color: "#10b981",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              RESOLVED
            </span>
          </div>
          <div style={{ color: "#94a3b8", fontWeight: 500, marginBottom: 4 }}>{inc.title}</div>
          <div style={{ color: "#475569", fontSize: 12 }}>
            by {inc.createdBy} · Opened {formatDate(inc.createdAt)}
            {inc.resolvedAt !== null ? (
              <span> · Resolved {formatDate(inc.resolvedAt)}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
