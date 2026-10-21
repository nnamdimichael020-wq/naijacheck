"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PostalState } from "@/lib/postal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function PostalSearch({ states }: { states: PostalState[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return states;
    return states.filter((s) => {
      const hay = [
        s.name,
        s.capital,
        s.slug,
        s.headOfficeCode,
        s.zoneCode,
        ...s.places.map((p) => `${p.name} ${p.code} ${p.label ?? ""}`),
      ].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [states, q]);

  return (
    <div className="space-y-4">
      <label className="block" htmlFor="postal-search">
        <span className="text-sm font-semibold">Search state, capital, place or code</span>
        <input
          id="postal-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. Lagos, Kano 700001, Wuse 900281, Port Harcourt"
          className="mt-1 w-full rounded-full border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {states.length} states{q.trim() ? ` for "${q.trim()}"` : ""}.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((s) => (
          <li key={s.slug}>
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link href={`/codes/postal/${s.slug}`} className="underline-offset-2 hover:text-primary hover:underline">
                      {s.name}
                    </Link>
                  </CardTitle>
                  <Badge variant="accent">{s.headOfficeCode}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{s.capital} · {s.places.length} place{s.places.length === 1 ? "" : "s"} · {s.range ?? s.zoneCode + "xxx"}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.intro}</p>
                <ul className="flex flex-wrap gap-1.5 text-xs">
                  {s.places.slice(0, 4).map((p) => (
                    <li key={p.code + p.name} className="rounded-full border bg-card/40 px-2 py-1 font-mono">
                      {p.code} <span className="font-sans text-muted-foreground">{p.name.split("—")[0].trim()}</span>
                    </li>
                  ))}
                  {s.places.length > 4 ? <li className="px-2 py-1 text-xs text-muted-foreground">+{s.places.length - 4} more</li> : null}
                </ul>
                <Link href={`/codes/postal/${s.slug}`} className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary">
                  Open {s.name} — all codes →
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
        {!filtered.length ? <li className="rounded-xl border bg-card/40 p-6 text-center text-sm text-muted-foreground">No states match “{q.trim()}”.</li> : null}
      </ul>
    </div>
  );
}
