export type TipBreakdown = { cashMinor: number; cardMinor: number };
export type WorkSegment = {
  role: string;
  startedAt: string;
  endedAt: string;
  wageMinor: number;
  tips: TipBreakdown;
  notes?: string;
};

function durationMinutes(segment: WorkSegment): number {
  const minutes = (Date.parse(segment.endedAt) - Date.parse(segment.startedAt)) / 60000;
  if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Segment must end after it starts");
  return minutes;
}

function segmentGrossMinor(segment: WorkSegment): number {
  return Math.round(segment.wageMinor * durationMinutes(segment) / 60) + segment.tips.cashMinor + segment.tips.cardMinor;
}

export function summarize(segments: WorkSegment[]) {
  const totals = segments.reduce(
    (sum, segment) => {
      const minutes = durationMinutes(segment);
      return {
        minutes: sum.minutes + minutes,
        grossMinor: sum.grossMinor + segmentGrossMinor(segment),
      };
    },
    { minutes: 0, grossMinor: 0 },
  );
  const { minutes, grossMinor } = totals;
  return { minutes, grossMinor, effectiveHourlyMinor: minutes ? Math.round(grossMinor * 60 / minutes) : 0 };
}

export function validateNoOverlap(segments: WorkSegment[]): void {
  const ordered = [...segments].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  ordered.forEach((segment, index) => {
    if (index && Date.parse(segment.startedAt) < Date.parse(ordered[index - 1].endedAt)) throw new Error("Segments cannot overlap");
  });
}

export function estimateNetMinor(grossMinor: number, withholdingBasisPoints: number): number {
  if (!Number.isInteger(withholdingBasisPoints) || withholdingBasisPoints < 0 || withholdingBasisPoints > 10000) throw new Error("Withholding must be 0-10000 basis points");
  return Math.round(grossMinor * (10000 - withholdingBasisPoints) / 10000);
}

export function toCsv(segments: WorkSegment[]): string {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  return ["role,started_at,ended_at,wage_minor,cash_tips_minor,card_tips_minor,notes", ...segments.map(s => [s.role, s.startedAt, s.endedAt, s.wageMinor, s.tips.cashMinor, s.tips.cardMinor, s.notes ?? ""].map(quote).join(","))].join("\n");
}
