import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryDelta } from "@/lib/history";

const WAT_SHORT = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatNairaDelta(amount: number, fractionDigits?: number): string {
  const abs = Math.abs(amount);
  const hasDecimals = fractionDigits !== undefined ? fractionDigits > 0 : !Number.isInteger(abs);
  const formatted = abs.toLocaleString("en-NG", {
    minimumFractionDigits: fractionDigits ?? (hasDecimals ? 2 : 0),
    maximumFractionDigits: fractionDigits ?? (hasDecimals ? 2 : 0),
  });
  return `₦${formatted}`;
}

export function ChangeBadge({
  delta,
  unitSuffix = "",
  fractionDigits,
  showNoPrior = true,
  className,
}: {
  delta: HistoryDelta | null;
  unitSuffix?: string;
  fractionDigits?: number;
  showNoPrior?: boolean;
  className?: string;
}) {
  if (!delta) {
    if (!showNoPrior) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
          className,
        )}
      >
        No prior reading
      </span>
    );
  }

  const prevWat = WAT_SHORT.format(new Date(delta.previous.sourceTime));
  const prevValueText = `₦${delta.previous.value.toLocaleString("en-NG")}${unitSuffix}`;

  if (delta.direction === "flat" || delta.delta === 0) {
    return (
      <span
        title={`Unchanged from ${prevValueText} (${prevWat} WAT)`}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border border-border bg-secondary/70 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground/85",
          className,
        )}
      >
        <Minus className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>₦0{unitSuffix} vs prior</span>
      </span>
    );
  }

  const isUp = delta.direction === "up";
  const sign = isUp ? "+" : "-";
  const deltaText = `${sign}${formatNairaDelta(delta.delta, fractionDigits)}${unitSuffix}`;

  return (
    <span
      title={`Previous reading: ${prevValueText} as of ${prevWat} WAT`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        isUp
          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
        className,
      )}
    >
      {isUp ? (
        <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="size-3 shrink-0" aria-hidden="true" />
      )}
      <span>{deltaText} vs prior</span>
    </span>
  );
}
