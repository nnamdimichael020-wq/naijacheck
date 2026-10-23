/**
 * Deterministic WAT (Africa/Lagos, UTC+1) 12-hour am/pm clock formatting.
 * Nigeria has no DST — we delegate to Intl with explicit timeZone so the
 * result never depends on visitor TZ.
 */
export const WAT_TIME_ZONE = "Africa/Lagos" as const;
export const WAT_LABEL = "WAT" as const;

function normalize12hPart(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(AM|PM)\b/g, (m) => m.toLowerCase());
}

/**
 * Format: "Friday, 23 Oct 2026 · 2:17:05 am WAT"
 * - weekday long, day 2-digit, month short, year numeric
 * - 12-hour time with minutes, seconds, and am/pm (en-NG / Africa/Lagos)
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
  })
    .format(date)
    .replace(/\s+/g, " ")
    .trim();

  const timePart = normalize12hPart(
    new Intl.DateTimeFormat("en-NG", {
      timeZone: WAT_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date),
  );

  return `${datePart} · ${timePart} ${WAT_LABEL}`;
}

/**
 * Short form for reduced space: "23 Oct 2026 · 2:17 am WAT"
 */
export function formatWatClockShort(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("en-NG", {
    timeZone: WAT_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(/\s+/g, " ")
    .trim();

  const timePart = normalize12hPart(
    new Intl.DateTimeFormat("en-NG", {
      timeZone: WAT_TIME_ZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  );

  return `${datePart} · ${timePart} ${WAT_LABEL}`;
}
