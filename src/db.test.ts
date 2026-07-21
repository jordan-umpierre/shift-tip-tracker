import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { migrateDatabase, saveShiftInDatabase } from "./db-core";

describe("SQLite shift persistence", () => {
  it("commits the parent shift and segment together with foreign keys enabled", () => {
    const sqlite = new DatabaseSync(":memory:");
    const database = {
      execSync: (sql: string) => sqlite.exec(sql),
      runSync: (sql: string, ...params: SQLInputValue[]) => sqlite.prepare(sql).run(...params),
      withTransactionSync(task: () => void) {
        sqlite.exec("BEGIN");
        try { task(); sqlite.exec("COMMIT"); }
        catch (error) { sqlite.exec("ROLLBACK"); throw error; }
      },
    };
    migrateDatabase(database);
    saveShiftInDatabase(database, "shift-1", {
      role: "Server",
      startedAt: "2026-07-19T12:00:00Z",
      endedAt: "2026-07-19T16:00:00Z",
      wageMinor: 1500,
      tips: { cashMinor: 2000, cardMinor: 0 },
    });
    expect(sqlite.prepare("SELECT count(*) AS count FROM shifts").get()).toEqual({ count: 1 });
    expect(sqlite.prepare("SELECT shift_id FROM work_segments").get()).toEqual({ shift_id: "shift-1" });
    expect(() => sqlite.prepare("INSERT INTO work_segments (id, shift_id, role, started_at, ended_at, wage_minor) VALUES ('orphan', 'missing', 'Server', 'a', 'b', 1)").run()).toThrow();
    sqlite.close();
  });
});
