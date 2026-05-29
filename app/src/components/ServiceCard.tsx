import type { ServiceStatus, DisplayStatus } from "../types";

const STATUS_CONFIG: Record<DisplayStatus, { label: string; color: string; bg: string }> = {
  ok: { label: "OK", color: "#10b981", bg: "#022c22" },
  critical: { label: "CRITICAL", color: "#ef4444", bg: "#1f0707" },
  investigating: { label: "INVESTIGATING", color: "#f59e0b", bg: "#1c1007" },
  recovery_in_process: { label: "RECOVERY IN PROCESS", color: "#3b82f6", bg: "#071428" },
  unknown: { label: "UNKNOWN", color: "#6b7280", bg: "#111827" },
};

type Props = { service: ServiceStatus };

function formatCheckedAt(iso: string | null): string {
  if (!iso) return "never checked";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  return `${Math.floor(diff / 60)}m ago`;
}

export function ServiceCard({ service }: Props) {
  const cfg = STATUS_CONFIG[service.status];

  return (
    <div
      style={{
        background: "#1e293b",
        border: `1px solid ${cfg.color}44`,
        borderRadius: 12,
        padding: "24px 28px",
        flex: 1,
        minWidth: 200,
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
        {service.name.toUpperCase()}
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: cfg.bg,
          border: `1px solid ${cfg.color}66`,
          borderRadius: 6,
          padding: "6px 12px",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: cfg.color,
            boxShadow: `0 0 6px ${cfg.color}`,
          }}
        />
        <span style={{ color: cfg.color, fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ color: "#475569", fontSize: 12 }}>
        checked {formatCheckedAt(service.checkedAt)}
      </div>
    </div>
  );
}
