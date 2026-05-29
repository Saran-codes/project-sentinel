import { app } from "./app";
import { log } from "./logger";

const PORT = 3001;

app.listen(PORT, () => {
  log(`service-a listening on port ${PORT}`);
});
