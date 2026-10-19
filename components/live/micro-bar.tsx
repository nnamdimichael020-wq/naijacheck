"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { VerificationState } from "@/lib/source-registry";
import { microReadingState } from "@/lib/micro-reading";

export type MicroReading = {
  label: string;
  value: string;
  href: string;
  checkedAt: string | null;
  sourceTime: string | null;
  state: VerificationState;
  staleAfterHours: number;
};

const CHECK_FORMAT = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false,
});

function checkedLabel(checkedAt: string | null): string {
  const ms = checkedAt ? Date.parse(checkedAt) : NaN;
  return Number.isFinite(ms) ? `Checked ${CHECK_FORMAT.format(ms)} WAT` : "No recorded check";
}

/** No polling or network request: only the age label changes as the saved snapshot gets older. */
export function LiveMicroBar({ readings }: { readings: MicroReading[] }) {
  const pathname = usePathname();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // /status already has source times, history and health; /admin is not a public content page.
  if (pathname === "/status" || pathname === "/admin" || pathname?.startsWith("/admin/")) return null;

  return (
    <div className="border-b bg-secondary/60" role="region" aria-label="Saved FX and fuel readings">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-[11px] lg:px-6">
        <span className="shrink-0 font-semibold text-foreground"><span className="md:hidden">Saved<br />not live</span><span className="hidden md:inline">FX &amp; fuel</span></span>
        <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain pb-0.5" aria-label="Snapshot readings, swipe for more">
          {readings.map((item) => (
            <li key={item.label} className="min-w-[175px] shrink-0 rounded-md border border-border/70 bg-background/70 px-2 py-0.5 md:min-w-0 md:flex-1">
              <Link href={item.href} className="flex items-center justify-between gap-1 font-semibold hover:text-primary hover:underline">
                <span className="truncate">{item.label}</span>
                <span className="shrink-0 tabular-nums">{item.value}</span>
              </Link>
              <p className="truncate text-muted-foreground" title={`${item.sourceTime ? `Source: ${item.sourceTime}. ` : ""}${checkedLabel(item.checkedAt)}. Saved snapshot, not live updates.`}>
                {microReadingState(item, now)} · {checkedLabel(item.checkedAt)}
              </p>
            </li>
          ))}
        </ul>
        <span className="hidden shrink-0 text-muted-foreground lg:inline">Saved snapshot · no auto-live</span>
      </div>
    </div>
  );
}
