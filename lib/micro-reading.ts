import type { VerificationState } from "@/lib/source-registry";

type ReadingState = {
  state: VerificationState;
  checkedAt: string | null;
  sourceTime: string | null;
  staleAfterHours: number;
};

/** A saved check is not a live connection. Never upgrade a recorded stale/seeded state. */
export function microReadingState(reading: ReadingState, nowMs: number | null): string {
  if (reading.state === "seeded") return "Seeded, unverified";
  if (reading.state === "unavailable" || !reading.sourceTime || !reading.checkedAt) return "Unavailable";
  if (reading.state === "manual") return "Manual";
  if (reading.state === "stale") return "Stale";
  const sourceMs = Date.parse(reading.sourceTime);
  const checkMs = Date.parse(reading.checkedAt);
  if (!Number.isFinite(sourceMs) || !Number.isFinite(checkMs)) return "Unavailable";
  if (nowMs !== null && (sourceMs > nowMs || checkMs > nowMs || nowMs - sourceMs > reading.staleAfterHours * 3_600_000)) return "Stale";
  // 'live' in the registry means a recent source reading, not a continuously live page.
  return "Recent at last check";
}
