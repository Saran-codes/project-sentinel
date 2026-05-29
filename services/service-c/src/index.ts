import { app } from "./app";
import { log } from "./logger";

const PORT = 3003;

app.listen(PORT, () => {
  log(`service-c listening on port ${PORT}`);
});
