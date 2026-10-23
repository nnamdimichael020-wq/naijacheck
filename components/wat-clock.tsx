"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Clock3 } from "lucide-react";
import { formatWatClock } from "@/lib/wat-clock";

/**
 * Site-wide WAT clock.
 * - Fixed Africa/Lagos (Intl + Africa/Lagos), never visitor local TZ.
 * - Detailed 12-hour human format: "Friday, 23 Oct 2026 · 2:17:05 am WAT".
 * - Live tick every 1s (cheap — single Intl format per tick).
 * - SSR-friendly: server renders first-paint time; client hydrates with
 *   suppressHydrationWarning to avoid mismatch flash when seconds differ.
 * - Compact on mobile (may wrap once), readable in dark mode, does not
 *   overlay bottom nav or push sheet (normal-flow slim bar).
 * - Honesty: labelled as Nigeria time — not implied FX refresh.
 */
export function WatClockBar() {
  const pathname = usePathname();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // Align to next second to avoid jitter, then tick every 1s
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <div
      className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="region"
      aria-label="Nigeria time"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-1.5 px-4 py-1.5 text-xs sm:gap-2 sm:py-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
          <Clock3 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">Nigeria time (WAT)</span>
          <span className="sm:hidden">WAT</span>
          <span aria-hidden className="text-border">
            ·
          </span>
        </span>
        <time
          dateTime={now.toISOString()}
          suppressHydrationWarning
          className="font-mono text-[11px] font-semibold tracking-tight text-foreground tabular-nums sm:text-xs"
          title="Africa/Lagos — West Africa Time, UTC+1. This is clock time in Nigeria, not an FX update timestamp."
        >
          {formatWatClock(now)}
        </time>
        <span className="hidden text-[11px] text-muted-foreground sm:inline">
          — clock time in Lagos, not an update tick
        </span>
      </div>
    </div>
  );
}
