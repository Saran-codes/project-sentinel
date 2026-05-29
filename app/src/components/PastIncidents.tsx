import { useState } from "react";
import type { Incident } from "../types";

const SEVERITY_COLOR: Record<string, string> = {
  P1: "#ff4040",
  P2: "#ff9d00",
  P3: "#2689ff",
};

function sc(severity: string): string {
  return SEVERITY_COLOR[severity] ?? "#4a5568";
}

function parseUtc(iso: string): Date {
  return new Date(iso.replace(" ", "T") + "Z");
}

function formatDate(iso: string): string {
  return parseUtc(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function duration(start: string, end: string): string {
  const mins = Math.round(
    (parseUtc(end).getTime() - parseUtc(start).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function PastIncidentRow({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(false);
  const color = sc(incident.severity);

  return (
    <div
      style={{
        borderBottom: "1px solid #0a1828",
        padding: "14px 4px",
      }}
    >
      {/* Main row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#0dba8a", fontSize: 14, flexShrink: 0 }}>✓</span>

        <span
          style={{
            color,
            background: `${color}10`,
            border: `1px solid ${color}28`,
            fontSize: 13,
            fontWeight: 700,
            padding: "1px 6px",
            borderRadius: 3,
            letterSpacing: 0.8,
            flexShrink: 0,
            alignSelf: "center",
          }}
        >
          {incident.severity}
        </span>

        <span style={{ color: "#4d6885", fontSize: 15, flexShrink: 0 }}>
          {incident.service}
        </span>

        <span
          style={{
            color: "#9ab8d0",
            fontSize: 16,
            flex: 1,
            minWidth: 100,
          }}
        >
          {incident.title}
        </span>

        <button
          className={`report-toggle${expanded ? " open" : ""}`}
          onClick={() => { setExpanded(!expanded); }}
        >
          {expanded ? "▲ hide" : "▼ report"}
        </button>
      </div>

      {/* Timestamps */}
      <div
        style={{
          color: "#4d6885",
          fontSize: 15,
          marginTop: 5,
          paddingLeft: 22,
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span>{incident.createdBy}</span>
        <span>·</span>
        <span>{formatDate(incident.createdAt)}</span>
        {incident.resolvedAt !== null && (
          <>
            <span>→</span>
            <span>{formatDate(incident.resolvedAt)}</span>
            <span style={{ color: "#0dba8a88" }}>
              ({duration(incident.createdAt, incident.resolvedAt)})
            </span>
          </>
        )}
      </div>

      {/* Expanded report */}
      {expanded && (
        <div
          className="report-content"
          style={{
            marginTop: 12,
            marginLeft: 22,
            paddingLeft: 14,
            borderLeft: "2px solid #0d1e33",
            color: "#6b8aaa",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          {incident.report}
        </div>
      )}
    </div>
  );
}

type Props = { incidents: Incident[] };

export function PastIncidents({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div style={{ color: "#4d6885", fontSize: 15, fontStyle: "italic" }}>
        No incident history.
      </div>
    );
  }

  return (
    <div>
      {incidents.map((inc) => (
        <PastIncidentRow key={inc.id} incident={inc} />
      ))}
    </div>
  );
}
