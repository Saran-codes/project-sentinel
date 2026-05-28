export type ConvertedTime = {
  utc: string;
  us_eastern: string;
  us_central: string;
  us_mountain: string;
  us_pacific: string;
};

export type HealthResponse = {
  status: "ok" | "degraded";
};
