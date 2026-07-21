import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { summarize, type WorkSegment } from "../src/domain.ts";

const warmup = 3;
const repetitions = 20;
const workload: WorkSegment[] = Array.from({ length: 5000 }, (_, i) => ({ role: "server", startedAt: `2026-01-01T${String(Math.floor(i / 60) % 24).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`, endedAt: `2026-01-01T${String(Math.floor(i / 60) % 24).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:30Z`, wageMinor: 1500, tips: { cashMinor: i % 7, cardMinor: i % 11 } }));
const baselineSummarize = (segments: WorkSegment[]) => {
  const minutes = segments.reduce((sum, segment) => sum + (Date.parse(segment.endedAt) - Date.parse(segment.startedAt)) / 60000, 0);
  const grossMinor = segments.reduce((sum, segment) => sum + Math.round(segment.wageMinor * ((Date.parse(segment.endedAt) - Date.parse(segment.startedAt)) / 60000) / 60) + segment.tips.cashMinor + segment.tips.cardMinor, 0);
  return { minutes, grossMinor, effectiveHourlyMinor: minutes ? Math.round(grossMinor * 60 / minutes) : 0 };
};
const samples: number[] = [];
const baselineSamples: number[] = [];
for (let i = 0; i < warmup + repetitions; i++) {
  const baselineStart = performance.now();
  baselineSummarize(workload);
  if (i >= warmup) baselineSamples.push(performance.now() - baselineStart);
  const start = performance.now();
  summarize(workload);
  if (i >= warmup) samples.push(performance.now() - start);
}
const sorted = [...samples].sort((a, b) => a - b);
const baselineSorted = [...baselineSamples].sort((a, b) => a - b);
const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
const variance = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / samples.length;
const report = {
  standard: { warmup, repetitions, statistic: "median and p95", varianceTolerance: "coefficient of variation <= 0.25" },
  environment: { node: process.version, os: `${os.type()} ${os.release()}`, arch: os.arch(), cpu: os.cpus()[0]?.model ?? "unknown" },
  build: { command: "npm run typecheck", commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() },
  workload: "5,000 synthetic work segments summarized in memory; no personal or financial records",
  results: { samplesMs: samples, medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * 0.95)], coefficientOfVariation: Math.sqrt(variance) / mean, baselineMedianMs: baselineSorted[Math.floor(baselineSorted.length / 2)], medianChangePercent: Number(((1 - sorted[Math.floor(sorted.length / 2)]! / baselineSorted[Math.floor(baselineSorted.length / 2)]!) * 100).toFixed(1)) },
};
writeFileSync(new URL("../docs/performance.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log("wrote docs/performance.json");
