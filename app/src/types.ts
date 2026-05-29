export type DisplayStatus =
  | "ok"
  | "critical"
  | "investigating"
  | "recovery_in_process"
  | "unknown";

export type ServiceStatus = {
  name: string;
  status: DisplayStatus;
  checkedAt: string | null;
};

export type Incident = {
  id: number;
  service: string;
  status: string;
  title: string;
  report: string;
  severity: string;
  createdBy: string;
  createdAt: string;
  resolvedAt: string | null;
};
