import type { Incident } from "../types";

const SEVERITY_COLOR: Record<string, string> = {
  P1: "#ff4040",
  P2: "#ff9d00",
  P3: "#2689ff",
};

const STATUS_COLOR: Record<string, string> = {
  investigating: "#ff9d00",
  recovery_in_process: "#2689ff",
};

function sc(severity: string): string {
  return SEVERITY_COLOR[severity] ?? "#4a5568";
}

function stc(status: string): string {
  return STATUS_COLOR[status] ?? "#4a5568";
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

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - parseUtc(iso).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

type Props = { incidents: Incident[] };

export function ActiveIncidents({ incidents }: Props) {
  if (incidents.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: "#3d7a62",
          fontSize: 15,
          padding: "12px 0",
        }}
      >
        <span style={{ color: "#0dba8a", fontSize: 16 }}>●</span>
        All systems operational — no active incidents
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {incidents.map((inc) => {
        const borderColor = stc(inc.status);
        const sevColor = sc(inc.severity);

        return (
          <div
            key={inc.id}
            style={{
              background: "#080f1e",
              border: "1px solid #0d1e33",
              borderLeft: `3px solid ${borderColor}`,
              borderRadius: 8,
              padding: "18px 22px",
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: sevColor,
                  background: `${sevColor}12`,
                  border: `1px solid ${sevColor}30`,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 3,
                  letterSpacing: 0.8,
                }}
              >
                {inc.severity}
              </span>
              <span
                style={{
                  color: "#6b8aaa",
                  fontSize: 15,
                  background: "#0d1e33",
                  padding: "2px 9px",
                  borderRadius: 3,
                }}
              >
                {inc.service}
              </span>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  color: borderColor,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {inc.status.replace(/_/g, " ")}
              </span>
            </div>

            {/* Title */}
            <div
              style={{
                color: "#c5d5e8",
                fontSize: 18,
                fontWeight: 600,
                marginBottom: 10,
                letterSpacing: -0.2,
                lineHeight: 1.3,
              }}
            >
              {inc.title}
            </div>

            {/* Report */}
            <div
              style={{
                color: "#6b8aaa",
                fontSize: 17,
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              {inc.report}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "#4d6885",
                fontSize: 15,
                borderTop: "1px solid #0d1e33",
                paddingTop: 12,
              }}
            >
              <span style={{ color: "#5a7393" }}>{inc.createdBy}</span>
              <span>·</span>
              <span>{formatDate(inc.createdAt)}</span>
              <span style={{ marginLeft: "auto", color: `${borderColor}70` }}>
                {timeAgo(inc.createdAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
