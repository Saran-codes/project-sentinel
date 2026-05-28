export type TimeResponse = {
  utc: string;
};

export type HealthResponse = {
  status: "ok" | "degraded";
};
