import type { WorkSegment } from "./domain";

type SqlValue = string | number | null;

export type WritableDatabase = {
  execSync(sql: string): void;
  runSync(sql: string, ...params: SqlValue[]): unknown;
  withTransactionSync(task: () => void): void;
};

const SCHEMA = `PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);
  INSERT INTO schema_version (version) SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM schema_version);
  CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS shifts (id TEXT PRIMARY KEY NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, notes TEXT);
  CREATE TABLE IF NOT EXISTS work_segments (id TEXT PRIMARY KEY NOT NULL, shift_id TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE, role TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT NOT NULL, wage_minor INTEGER NOT NULL, cash_tips_minor INTEGER NOT NULL DEFAULT 0, card_tips_minor INTEGER NOT NULL DEFAULT 0, notes TEXT);
  CREATE TABLE IF NOT EXISTS paycheck_observations (id TEXT PRIMARY KEY NOT NULL, observed_at TEXT NOT NULL, gross_minor INTEGER NOT NULL, net_minor INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS purchase_entitlements (product_id TEXT PRIMARY KEY NOT NULL, restored_at TEXT NOT NULL);`;

export function migrateDatabase(database: WritableDatabase) {
  database.execSync(SCHEMA);
}

export function saveShiftInDatabase(database: WritableDatabase, shiftId: string, segment: WorkSegment) {
  const id = `${shiftId}:${segment.startedAt}`;
  database.withTransactionSync(() => {
    database.runSync("INSERT OR IGNORE INTO shifts (id, started_at, ended_at) VALUES (?, ?, ?)", shiftId, segment.startedAt, segment.endedAt);
    database.runSync("INSERT OR REPLACE INTO work_segments (id, shift_id, role, started_at, ended_at, wage_minor, cash_tips_minor, card_tips_minor, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", id, shiftId, segment.role, segment.startedAt, segment.endedAt, segment.wageMinor, segment.tips.cashMinor, segment.tips.cardMinor, segment.notes ?? null);
  });
}
