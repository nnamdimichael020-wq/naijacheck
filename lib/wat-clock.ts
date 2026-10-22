/**
 * Deterministic WAT (Africa/Lagos, UTC+1) detailed clock formatting.
 * Nigeria has no DST — we delegate to Intl with explicit timeZone so the
 * result never depends on visitor TZ. Prefer 24h clock for unambiguous reading.
 */
export const WAT_TIME_ZONE = "Africa/Lagos" as const;
export const WAT_LABEL = "WAT" as const;

/**
 * Format: "Thursday, 22 Oct 2026 · 01:42:15 WAT"
 * - weekday long, day 2-digit, month short, year numeric
 * - 24h HH:MM:SS with leading zeros
 * - separator middle-dot, suffix WAT
 */
export function formatWatClock(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "—";
  }
  const datePart = new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} · ${timePart} ${WAT_LABEL}`;
}

/**
 * Short form for reduced space: "22 Oct 2026 · 01:42 WAT"
 */
export function formatWatClockShort(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} · ${timePart} ${WAT_LABEL}`;
}
