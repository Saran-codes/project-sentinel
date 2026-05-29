import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.resolve(__dirname, "../../services/logs/health-poller.log");

export function log(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(LOG_FILE, line);
}
