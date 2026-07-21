import { describe, expect, it } from "vitest";
import { estimateNetMinor, summarize, toCsv, validateNoOverlap } from "./domain";

const segment = (start: string, end: string) => ({ role: "server", startedAt: start, endedAt: end, wageMinor: 1500, tips: { cashMinor: 1200, cardMinor: 800 } });

describe("shift calculations", () => {
  it("uses integer minor units and decimal-safe hourly totals", () => {
    expect(summarize([segment("2026-01-01T16:00:00Z", "2026-01-01T20:00:00Z")])).toEqual({ minutes: 240, grossMinor: 8000, effectiveHourlyMinor: 2000 });
  });
  it("rejects overlapping segments and labels estimates through a pure function", () => {
    expect(() => validateNoOverlap([segment("2026-01-01T16:00:00Z", "2026-01-01T20:00:00Z"), segment("2026-01-01T19:00:00Z", "2026-01-01T21:00:00Z")])).toThrow();
    expect(estimateNetMinor(10000, 2250)).toBe(7750);
  });
  it("escapes CSV fields", () => expect(toCsv([{ ...segment("a", "b"), role: "bar, \"lead\"" }])).toContain('"bar, ""lead"""'));
});
