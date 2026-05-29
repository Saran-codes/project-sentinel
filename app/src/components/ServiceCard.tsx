import type { ServiceStatus, DisplayStatus } from "../types";

type StatusCfg = {
  label: string;
  color: string;
  borderColor: string;
  topColor: string;
};

const STATUS_CONFIG: Record<DisplayStatus, StatusCfg> = {
  ok: {
    label: "OK",
    color: "#0dba8a",
    borderColor: "#0dba8a22",
    topColor: "#0dba8a",
  },
  critical: {
    label: "CRITICAL",
    color: "#ff4040",
    borderColor: "#ff404022",
    topColor: "#ff4040",
  },
  investigating: {
    label: "INVESTIGATING",
    color: "#ff9d00",
    borderColor: "#ff9d0022",
    topColor: "#ff9d00",
  },
  recovery_in_process: {
    label: "RECOVERY IN PROCESS",
    color: "#2689ff",
    borderColor: "#2689ff22",
    topColor: "#2689ff",
  },
  unknown: {
    label: "UNKNOWN",
    color: "#4a5568",
    borderColor: "#4a556822",
    topColor: "#4a5568",
  },
};

function dotClassName(status: DisplayStatus): string {
  return `status-dot status-dot--${status}`;
}

type Props = { service: ServiceStatus };

function parseUtc(iso: string): Date {
  return new Date(iso.replace(" ", "T") + "Z");
}

function formatCheckedAt(iso: string | null): string {
  if (iso === null) return "never checked";
  const diff = Math.floor((Date.now() - parseUtc(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

export function ServiceCard({ service }: Props) {
  const cfg = STATUS_CONFIG[service.status];

  return (
    <div
      style={{
        background: "#080f1e",
        border: `1px solid ${cfg.borderColor}`,
        borderTop: `2px solid ${cfg.topColor}`,
        borderRadius: 8,
        padding: "22px 24px 18px",
        transition: "border-color 0.3s",
      }}
    >
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          color: "#5a7393",
          fontSize: 14,
          letterSpacing: 2.5,
          marginBottom: 18,
        }}
      >
        {service.name.toUpperCase()}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span className={dotClassName(service.status)} />
        <span
          style={{
            color: cfg.color,
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {cfg.label}
        </span>
      </div>

      <div style={{ color: "#4d6885", fontSize: 13 }}>
        checked {formatCheckedAt(service.checkedAt)}
      </div>
    </div>
  );
}
