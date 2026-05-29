import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Mutation = {
  description: string;
  file: string;
  from: string;
  to: string;
};

type ServiceConfig = {
  name: string;
  mutations: readonly Mutation[];
};

const ROOT = path.resolve(__dirname, "../..");

const SERVICES: readonly ServiceConfig[] = [
  {
    name: "service-a",
    mutations: [
      {
        description: "Rename UTC key in /time response — service-b reads .utc and gets undefined",
        file: "services/service-a/src/routes/time.ts",
        from: "{ utc: new Date().toISOString() }",
        to: "{ timestamp: new Date().toISOString() }",
      },
      {
        description: "Break /time route mount to /tiime — all polls from service-b get 404",
        file: "services/service-a/src/app.ts",
        from: 'app.use("/time", timeRouter);',
        to: 'app.use("/tiime", timeRouter);',
      },
      {
        description: "Health always reports degraded — health poller marks service-a as down immediately",
        file: "services/service-a/src/app.ts",
        from: '{ status: "ok" }',
        to: '{ status: "degraded" }',
      },
      {
        description: "Return empty object from /time — service-b gets undefined utc, new Date(undefined) is invalid",
        file: "services/service-a/src/routes/time.ts",
        from: "res.json(response)",
        to: "res.json({})",
      },
      {
        description: "Health endpoint returns 503 — triggers incident in health poller even though logic is ok",
        file: "services/service-a/src/app.ts",
        from: "res.status(200).json(response)",
        to: "res.status(503).json(response)",
      },
    ],
  },
  {
    name: "service-b",
    mutations: [
      {
        description: "Wrong port for service-a (3001 → 3099) — every poll fails with ECONNREFUSED",
        file: "services/service-b/src/app.ts",
        from: '"http://localhost:3001"',
        to: '"http://localhost:3099"',
      },
      {
        description: "Wrong port for service-c (3003 → 3099) — POST to service-c fails on every poll",
        file: "services/service-b/src/app.ts",
        from: '"http://localhost:3003"',
        to: '"http://localhost:3099"',
      },
      {
        description: "Typo in timezone (America/New_York → New_Yrok) — Intl.DateTimeFormat throws RangeError",
        file: "services/service-b/src/app.ts",
        from: '"America/New_York"',
        to: '"America/New_Yrok"',
      },
      {
        description: "FAILURE_THRESHOLD set to 0 — health instantly reports degraded on the very first poll",
        file: "services/service-b/src/app.ts",
        from: "const FAILURE_THRESHOLD = 3;",
        to: "const FAILURE_THRESHOLD = 0;",
      },
      {
        description: "POST to service-c changed to GET — route doesn't exist, service-c returns 404 on every poll",
        file: "services/service-b/src/app.ts",
        from: 'method: "POST"',
        to: 'method: "GET"',
      },
      {
        description: "Send empty body to service-c — insertTimeRecord gets no fields, SQLite NOT NULL constraint fails",
        file: "services/service-b/src/app.ts",
        from: "body: JSON.stringify(payload)",
        to: "body: JSON.stringify({})",
      },
    ],
  },
  {
    name: "service-c",
    mutations: [
      {
        description: "Break /time route mount to /tiime — service-b's POST gets 404",
        file: "services/service-c/src/app.ts",
        from: 'app.use("/time", timeRouter);',
        to: 'app.use("/tiime", timeRouter);',
      },
      {
        description: "Return 500 instead of 201 — service-b sees HTTP error on every POST",
        file: "services/service-c/src/routes/time.ts",
        from: "res.status(201).json({ stored: true })",
        to: "res.status(500).json({ stored: false })",
      },
      {
        description: "Bad column in INSERT (us_eastern → us_eastrn) — SQLite throws 'no such column' on every write",
        file: "services/service-c/src/db/index.ts",
        from: "utc, us_eastern",
        to: "utc, us_eastrn",
      },
      {
        description: "Route handler changed from POST to GET — service-b's POST never matches, returns 404",
        file: "services/service-c/src/routes/time.ts",
        from: "router.post(\"/\",",
        to: "router.get(\"/\",",
      },
      {
        description: "DB written to wrong path (sentinel.db → broken.db) — records silently disappear from main DB",
        file: "services/service-c/src/db/index.ts",
        from: '"../../../../db/sentinel.db"',
        to: '"../../../../db/broken.db"',
      },
      {
        description: "Health returns 503/degraded — health poller marks service-c down, but POST /time still works",
        file: "services/service-c/src/app.ts",
        from: 'const response: HealthResponse = { status: "ok" };',
        to: 'const response: HealthResponse = { status: "degraded" };',
      },
    ],
  },
];

function pickRandomSubset<T>(arr: readonly T[]): T[] {
  const count = Math.floor(Math.random() * arr.length) + 1;
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function pickOneOrTwo<T>(arr: readonly T[]): T[] {
  const count = arr.length === 1 ? 1 : Math.floor(Math.random() * 2) + 1;
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

const appliedDescriptions: string[] = [];

function applyMutation(mutation: Mutation): void {
  const filePath = path.join(ROOT, mutation.file);
  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.includes(mutation.from)) {
    console.log(`[skip]    ${mutation.description}`);
    console.log(`          pattern not found in ${mutation.file} (already mutated?)`);
    return;
  }
  const mutated = content.replace(mutation.from, mutation.to);
  fs.writeFileSync(filePath, mutated, "utf-8");
  console.log(`[mutated] ${mutation.description}`);
  console.log(`          ${mutation.file}`);
  appliedDescriptions.push(mutation.description);
}

const targets = pickRandomSubset(SERVICES);
console.log(
  `\nChaos Monkey targeting ${targets.length} service(s): ${targets.map((s) => s.name).join(", ")}\n`,
);

for (const svc of targets) {
  const mutations = pickOneOrTwo(svc.mutations);
  for (const mutation of mutations) {
    applyMutation(mutation);
  }
  console.log("");
}

if (appliedDescriptions.length === 0) {
  console.log("No mutations applied — nothing to commit.\n");
} else {
  const body = appliedDescriptions.map((d) => `- ${d}`).join("\n");
  const message = `chore(chaos): inject ${appliedDescriptions.length} mutation(s)\n\n${body}`;
  try {
    execSync("git add services/", { cwd: ROOT, stdio: "inherit" });
    execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: ROOT, stdio: "inherit" });
    execSync("git push", { cwd: ROOT, stdio: "inherit" });
    console.log("\n[chaos] Mutations committed and pushed.\n");
  } catch (err) {
    console.error("[chaos] Git operation failed:", err);
    process.exit(1);
  }
}
