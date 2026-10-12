import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------- Deterministic WAT (Africa/Lagos) formatting ----------
 * Nigeria has observed UTC+1 with no daylight saving since 1994, so these helpers shift the
 * timestamp by one hour and read UTC fields. That keeps output byte-identical between the Node
 * build and the browser, which Intl time-zone formatting cannot guarantee for a client component.
 */

const WAT_OFFSET_MS = 60 * 60 * 1000;
const WAT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function watParts(ms: number) {
  const d = new Date(ms + WAT_OFFSET_MS);
  const hour24 = d.getUTCHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    day: d.getUTCDate(),
    month: WAT_MONTHS[d.getUTCMonth()],
    year: d.getUTCFullYear(),
    hour12,
    minute: String(d.getUTCMinutes()).padStart(2, "0"),
    dayPart: hour24 < 12 ? "am" : "pm",
  };
}

/** "11 Oct 2026" in Lagos time. Returns an honest fallback rather than an invented date. */
export function formatWatDay(ms: number): string {
  if (!Number.isFinite(ms)) return "date unavailable";
  const p = watParts(ms);
  return `${p.day} ${p.month} ${p.year}`;
}

/** "11 Oct, 8:06 pm" in Lagos time (no year, for tight chart axes). */
export function formatWatDayTime(ms: number): string {
  if (!Number.isFinite(ms)) return "time unavailable";
  const p = watParts(ms);
  return `${p.day} ${p.month}, ${p.hour12}:${p.minute} ${p.dayPart}`;
}

/** "11 Oct 2026, 8:06 pm WAT" in Lagos time. */
export function formatWatFull(ms: number): string {
  if (!Number.isFinite(ms)) return "timestamp unavailable";
  const p = watParts(ms);
  return `${p.day} ${p.month} ${p.year}, ${p.hour12}:${p.minute} ${p.dayPart} WAT`;
}

/** "11 Oct" in Lagos time (no year), for compact chart footers. */
export function formatWatDayShort(ms: number): string {
  if (!Number.isFinite(ms)) return "date unavailable";
  const p = watParts(ms);
  return `${p.day} ${p.month}`;
}
