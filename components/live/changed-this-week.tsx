"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WeeklyChange } from "@/lib/changed-this-week";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function ChangedThisWeek({ entries, snapshotAt }: { entries: WeeklyChange[]; snapshotAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  // Static HTML is a saved snapshot. Retire entries in the browser when the deployed
  // export ages; there is no live polling or invented replacement content.
  const current = now === null ? entries : entries.filter((entry) => {
    if (entry.kind === "article") {
      const cutoffDate = new Date(now - WEEK_MS).toISOString().slice(0, 10);
      return entry.at > cutoffDate && entry.at <= new Date(now).toISOString().slice(0, 10);
    }
    const ms = Date.parse(entry.at);
    return ms >= now - WEEK_MS && ms <= now;
  });
  return (
    <section aria-labelledby="changed-week-heading" className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="changed-week-heading" className="text-lg font-bold">Changed this week</h2>
        <Link href="/status" className="text-xs font-semibold text-primary hover:underline">Source checks &amp; history →</Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Recorded moves and dated article edits only. Snapshot built {snapshotAt.slice(0, 16).replace("T", " ")} UTC; no continuous live feed or popularity ranking.</p>
      {current.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No verified move this week. No dated article update in the last seven days either; check <Link href="/status" className="text-primary underline">data status</Link> for the latest recorded checks.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {current.map((entry) => (
            <li key={entry.key} className="rounded-lg border bg-background/70 p-3 text-sm">
              <Link href={entry.href} className="font-semibold text-foreground hover:text-primary hover:underline">{entry.label} →</Link>
              <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{entry.kind === "reading" ? `Source time ${entry.at} (UTC)` : `Editorial date ${entry.at}`}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
