import type { Incident } from "../types";

const SEVERITY_COLOR: Record<string, string> = {
  P1: "#ef4444",
  P2: "#f59e0b",
  P3: "#3b82f6",
};

const STATUS_COLOR: Record<string, string> = {
  investigating: "#f59e0b",
  recovery_in_process: "#3b82f6",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function severityColor(s: string): string {
  return SEVERITY_COLOR[s] ?? "#6b7280";
}

function statusColor(s: string): string {
  return STATUS_COLOR[s] ?? "#6b7280";
}

type Props = { incidents: Incident[] };

export function ActiveIncidents({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div style={{ color: "#475569", fontSize: 14, fontStyle: "italic" }}>
        No active incidents.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {incidents.map((inc) => (
        <div
          key={inc.id}
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderLeft: `3px solid ${statusColor(inc.status)}`,
            borderRadius: 8,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span
              style={{
                background: `${severityColor(inc.severity)}22`,
                border: `1px solid ${severityColor(inc.severity)}66`,
                color: severityColor(inc.severity),
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {inc.severity}
            </span>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>{inc.service}</span>
            <span
              style={{
                marginLeft: "auto",
                color: statusColor(inc.status),
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {inc.status.replace(/_/g, " ")}
            </span>
          </div>
          <div style={{ color: "#e2e8f0", fontWeight: 600, marginBottom: 6 }}>{inc.title}</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 10, lineHeight: 1.5 }}>
            {inc.report}
          </div>
          <div style={{ color: "#475569", fontSize: 12 }}>
            Reported by <span style={{ color: "#64748b" }}>{inc.createdBy}</span> ·{" "}
            {formatDate(inc.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}
