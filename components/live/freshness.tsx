"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationState } from "@/lib/source-registry";

const WAT = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "just now", "12 min ago", "3 h ago", "2 days ago". */
export function relativeAge(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/**
 * Shows when a number was last read from its source, in Lagos time, with a live relative age.
 * The first render uses the absolute time only, so server and client HTML match.
 */
export function Freshness({
  asOf,
  label = "Source as of",
  source,
  state,
  className,
}: {
  asOf?: string | null;
  label?: string;
  source?: string;
  state?: VerificationState;
  className?: string;
}) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  if (!asOf) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <RefreshCw className="size-3" aria-hidden="true" /> No source reading available
      </span>
    );
  }
  const ms = Date.parse(asOf);
  const age = now === null ? null : now - ms;
  const staleByAge = age !== null && age > 9 * 3600_000; // more than three missed 3-hourly runs
  const effectiveState: VerificationState = state ?? (staleByAge ? "stale" : "recent");
  const stateText = effectiveState === "seeded"
    ? "Seeded — not monitor-verified"
    : effectiveState === "stale"
      ? "Stale last reading"
      : effectiveState === "unavailable"
        ? "Unavailable"
        : effectiveState === "manual"
          ? "Manual reading"
          : label;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", effectiveState === "seeded" || effectiveState === "stale" ? "bg-amber-500" : effectiveState === "unavailable" ? "bg-slate-400" : "bg-emerald-500")}
      />
      <span className="font-medium text-foreground/80">
        {stateText}
      </span>
      <span>
        {WAT.format(new Date(ms))} WAT{age !== null ? ` · ${relativeAge(age)}` : ""}
      </span>
      {source ? <span className="hidden sm:inline">· {source}</span> : null}
    </span>
  );
}
