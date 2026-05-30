// Regression for the DB-path mutation: the db module opened `db/broken.db`
// instead of the shared `db/sentinel.db`, so persisted records silently
// disappeared from the real database.
//
// DB_PATH is not exported from ../db, so we assert behaviorally: we intercept
// the path passed to the SQLite `DatabaseSync` constructor when the module
// first opens its connection, then trigger that connection via the only public
// export (insertTimeRecord) and assert it targets db/sentinel.db, not broken.db.

const openedPaths: string[] = [];

jest.mock("node:sqlite", () => {
  class FakeStatement {
    run(): void {
      /* no-op */
    }
  }
  class DatabaseSync {
    constructor(path: string) {
      openedPaths.push(path);
    }
    exec(): void {
      /* no-op */
    }
    prepare(): FakeStatement {
      return new FakeStatement();
    }
  }
  return { DatabaseSync };
});

import { insertTimeRecord } from "../db";

describe("service-c DB path", () => {
  it("opens db/sentinel.db (not broken.db) — regression for wrong DB path bug", () => {
    // First call lazily opens the database connection.
    insertTimeRecord({
      utc: "2024-01-15T10:00:00.000Z",
      us_eastern: "2024-01-15T05:00:00",
      us_central: "2024-01-15T04:00:00",
      us_mountain: "2024-01-15T03:00:00",
      us_pacific: "2024-01-15T02:00:00",
    });

    expect(openedPaths.length).toBeGreaterThan(0);
    const dbPath = openedPaths[0] ?? "";
    const normalized = dbPath.replace(/\\/g, "/");

    expect(normalized).toMatch(/\/db\/sentinel\.db$/);
    expect(normalized).not.toMatch(/broken\.db/);
  });
});
