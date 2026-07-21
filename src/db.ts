import * as SQLite from "expo-sqlite";
import type { WorkSegment } from "./domain";
import { migrateDatabase, saveShiftInDatabase } from "./db-core";

const db = SQLite.openDatabaseSync("shift-tip-tracker.db");

export function migrate() {
  migrateDatabase(db);
}

export function saveShift(shiftId: string, segment: WorkSegment) {
  saveShiftInDatabase(db, shiftId, segment);
}

export function getSegments(): WorkSegment[] {
  return db.getAllSync<WorkSegment & { cash_tips_minor: number; card_tips_minor: number }>("SELECT role, started_at as startedAt, ended_at as endedAt, wage_minor as wageMinor, cash_tips_minor, card_tips_minor FROM work_segments ORDER BY started_at DESC").map(row => ({ role: row.role, startedAt: row.startedAt, endedAt: row.endedAt, wageMinor: row.wageMinor, tips: { cashMinor: row.cash_tips_minor, cardMinor: row.card_tips_minor } }));
}
