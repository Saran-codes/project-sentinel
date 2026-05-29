import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.resolve(__dirname, "../../logs/service-a.log");

export function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  if (process.env["NODE_ENV"] !== "test") {
    fs.appendFileSync(LOG_FILE, line);
  }
}
