/**
 * Floating read-out ("HUD") for the stored-history charts — the TradingView-style price tag.
 *
 * Pure and hook-free so the full HistoryChart and the homepage sparkline render exactly the same
 * copy. Every string comes from `focusHudCopy()` in lib/chart-interaction, which only ever formats
 * ONE stored reading: its own value, unit, WAT time and change vs the previous plotted reading.
 *
 * Layout rules:
 *  - The HUD sits in its own track directly above the plot, so it never covers the line (a phone
 *    plot is only ~100px tall).
 *  - It rides along with the crosshair using proportional anchoring (`left: f·100%` of the track,
 *    `translateX(−f·100%)` of itself), so it always spans the crosshair x and never overflows.
 *  - Every line is single-line (`truncate`) and always rendered — the delta line shows a note at
 *    the first plotted reading — so the HUD keeps a constant height and the plot never jumps while
 *    a finger scrubs. Compact/large HUDs use four lines; the card-sparkline ("mini") HUD puts the
 *    label and price on one line, so it uses three.
 *  - No transitions or animation: the position updates instantly, and reduced motion is respected
 *    by construction.
 */
import type { ChartHudCopy } from "@/lib/chart-interaction";
import { cn } from "@/lib/utils";

export type ChartHudSize = "mini" | "compact" | "large";

export type ChartHudSecondary = { key: string; label: string; hud: ChartHudCopy | null };

const PRICE_CLASS: Record<ChartHudSize, string> = {
  mini: "text-sm",
  compact: "text-base",
  large: "text-xl",
};

const META_CLASS: Record<ChartHudSize, string> = {
  mini: "text-[10px]",
  compact: "text-[10px]",
  large: "text-[11px]",
};

function deltaTone(direction: ChartHudCopy["direction"], hasDelta: boolean): string {
  if (!hasDelta) return "text-muted-foreground";
  if (direction === "up") return "text-amber-800 dark:text-amber-300";
  if (direction === "down") return "text-emerald-800 dark:text-emerald-300";
  return "text-foreground/80";
}

/** Short WAT day-time ("17 Oct, 5:00 pm WAT") pulled from the full stamp for secondary lines. */
function shortStamp(full: string): string {
  // "17 Oct 2026, 5:00 pm WAT" → "17 Oct, 5:00 pm WAT"; anything unexpected is shown unchanged.
  return full.replace(/^(\d{1,2} [A-Z][a-z]{2}) \d{4},/, "$1,");
}

export function ChartHud({
  id,
  hud,
  size,
  fraction,
  secondary = [],
  className,
}: {
  id?: string;
  hud: ChartHudCopy;
  size: ChartHudSize;
  /** 0..1 crosshair position along the plot, from crosshairLabelFraction(). */
  fraction: number;
  /** Extra series on the same axis: one compact label + price line and one time line each. */
  secondary?: ChartHudSecondary[];
  className?: string;
}) {
  const f = Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 1;
  const scrubbing = hud.mode === "selected";
  const meta = META_CLASS[size];
  return (
    <div
      id={id}
      data-chart-hud={hud.mode}
      className={cn(
        "relative w-max max-w-full rounded-lg border bg-background/95 px-2 py-1 text-left shadow-md",
        scrubbing ? "border-primary/60" : "border-border",
        className,
      )}
      style={{ left: `${f * 100}%`, transform: `translateX(-${f * 100}%)` }}
    >
      {size === "mini" ? (
        // Scaled down for card sparklines: label and price share one line (three lines in total).
        <p className="truncate leading-tight">
          <span data-hud="label" className="mr-1.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            {hud.label}
          </span>
          <span data-hud="price" className={cn("font-extrabold tabular-nums text-foreground", PRICE_CLASS[size])}>
            {hud.price}
          </span>
          {hud.unit ? <span className={cn("ml-1 text-muted-foreground", meta)}>{hud.unit}</span> : null}
        </p>
      ) : (
        <>
          <p data-hud="label" className="truncate text-[9px] font-bold uppercase leading-tight tracking-wide text-muted-foreground">
            {hud.label}
          </p>
          <p className="truncate leading-tight">
            <span data-hud="price" className={cn("font-extrabold tabular-nums text-foreground", PRICE_CLASS[size])}>
              {hud.price}
            </span>
            {hud.unit ? <span className={cn("ml-1 text-muted-foreground", meta)}>{hud.unit}</span> : null}
          </p>
        </>
      )}
      <p data-hud="time" className={cn("truncate leading-tight tabular-nums text-foreground/80", meta)}>
        {hud.timestamp}
      </p>
      <p data-hud="delta" className={cn("truncate font-semibold leading-tight tabular-nums", meta, deltaTone(hud.direction, hud.delta !== null))}>
        {hud.delta ? (
          <>
            {hud.delta} <span className="font-normal text-muted-foreground">{hud.deltaNote}</span>
          </>
        ) : (
          <span className="font-normal">{hud.deltaNote}</span>
        )}
      </p>
      {secondary.map((row) =>
        row.hud ? (
          <div key={row.key} className={cn("mt-1 border-t pt-1 leading-tight tabular-nums", meta)}>
            <p className="truncate">
              <span className="font-semibold text-foreground/85">{row.label}</span>{" "}
              <span className="font-bold text-foreground">{row.hud.price}</span>
            </p>
            <p className="truncate text-muted-foreground">{shortStamp(row.hud.timestamp)}</p>
          </div>
        ) : null,
      )}
    </div>
  );
}
