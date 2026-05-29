import { app, poll } from "./app";
import { log } from "./logger";

const PORT = 3002;
const POLL_INTERVAL_MS = 5000;

setInterval(() => { void poll(); }, POLL_INTERVAL_MS);

app.listen(PORT, () => {
  log(`service-b listening on port ${PORT}, polling every ${POLL_INTERVAL_MS}ms`);
});
