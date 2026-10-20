/**
 * Deterministic value formatting and series tones shared by every chart surface.
 *
 * Split out from `lib/chart-series.ts` so client components (the interactive sparkline on the
 * homepage, for example) can format a stored reading without pulling the live JSON snapshots
 * into the browser bundle. No Intl, no locale dependence: server HTML and hydration always match.
 */

export type SeriesMarker = "circle" | "square" | "triangle" | "diamond";
export type SeriesTone = "primary" | "amber" | "sky" | "violet";

/** Tailwind text colours. Series also differ by dash and marker, never by colour alone. */
export const TONE_CLASS: Record<SeriesTone, string> = {
  primary: "text-primary",
  amber: "text-amber-600 dark:text-amber-400",
  sky: "text-sky-700 dark:text-sky-400",
  violet: "text-violet-700 dark:text-violet-400",
};

const group3 = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Deterministic naira formatting (no Intl) so server HTML and client hydration always match. */
export function formatChartValue(value: number, fractionDigits?: number, unitSuffix?: string): string {
  if (!Number.isFinite(value)) return "Unavailable";
  const digits = fractionDigits ?? (Number.isInteger(value) ? 0 : 2);
  const fixed = Math.abs(value).toFixed(digits);
  const [whole, decimal] = fixed.split(".");
  return `₦${group3(whole)}${decimal ? `.${decimal}` : ""}${unitSuffix ?? ""}`;
}

/** Axis labels stay narrow on phones: fewer decimals when the plotted range is wide. */
export function axisDigits(span: number): number {
  if (span <= 0) return 0;
  if (span >= 20) return 0;
  if (span >= 2) return 1;
  return 2;
}
