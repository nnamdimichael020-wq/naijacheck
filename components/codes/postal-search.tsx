"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PostalGeopoliticalZone, PostalPlace, PostalState } from "@/lib/postal";
import { POSTAL_GEOPOLITICAL_ZONES } from "@/lib/postal";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/codes/copy-button";

const QUICK_QUERIES = ["Aba", "Lekki", "Ajah", "Wuse II", "Sango-Ota", "Onitsha", "Bonny", "Nsukka"] as const;

type PlaceMatch = {
  state: PostalState;
  place: PostalPlace;
  leafHref: string | null;
  score: number;
};

export function PostalSearch({
  states,
  curatedLeafKeys,
}: {
  states: PostalState[];
  curatedLeafKeys: string[];
}) {
  const [q, setQ] = useState("");
  const [zone, setZone] = useState<PostalGeopoliticalZone | "all">("all");

  const leafSet = useMemo(() => new Set(curatedLeafKeys), [curatedLeafKeys]);

  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = { all: states.length };
    for (const z of POSTAL_GEOPOLITICAL_ZONES) {
      counts[z] = states.filter((s) => s.geopoliticalZone === z).length;
    }
    return counts;
  }, [states]);

  const zonePool = useMemo(
    () => (zone === "all" ? states : states.filter((s) => s.geopoliticalZone === zone)),
    [states, zone],
  );

  const needle = q.trim().toLowerCase();

  const matchedPlaces = useMemo((): PlaceMatch[] => {
    if (!needle) return [];
    const tokens = needle.split(/\s+/).filter(Boolean);
    const out: PlaceMatch[] = [];
    for (const s of zonePool) {
      for (const p of s.places) {
        const hay = `${p.name} ${p.code} ${p.label ?? ""} ${p.slug ?? ""} ${s.name} ${s.capital}`.toLowerCase();
        if (!tokens.every((t) => hay.includes(t))) continue;
        const nameLower = p.name.toLowerCase();
        let score = 1;
        if (p.code === needle) score += 20;
        else if (p.code.startsWith(needle)) score += 10;
        if (nameLower === needle) score += 16;
        else if (nameLower.startsWith(needle)) score += 10;
        else if (nameLower.includes(needle)) score += 6;
        if ((p.label ?? "").toLowerCase().includes(needle)) score += 3;
        const key = `${s.slug}/${p.slug ?? ""}`;
        out.push({
          state: s,
          place: p,
          leafHref: leafSet.has(key) ? `/codes/postal/${key}` : null,
          score,
        });
      }
    }
    return out.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name)).slice(0, 24);
  }, [zonePool, needle, leafSet]);

  const filteredStates = useMemo(() => {
    if (!needle) return zonePool;
    const tokens = needle.split(/\s+/).filter(Boolean);
    return zonePool.filter((s) => {
      const hay = [
        s.name,
        s.capital,
        s.slug,
        s.geopoliticalZone,
        s.headOfficeCode,
        s.zoneCode,
        s.range ?? "",
        ...s.places.map((p) => `${p.name} ${p.code} ${p.label ?? ""}`),
      ]
        .join(" ")
        .toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [zonePool, needle]);

  const totalZonePlaces = useMemo(
    () => zonePool.reduce((sum, s) => sum + s.places.length, 0),
    [zonePool],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block" htmlFor="postal-search">
          <span className="text-sm font-semibold">Search state, city, district, LGA or 6-digit code</span>
          <div className="relative mt-1 flex items-center gap-2">
            <input
              id="postal-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Aba, Ajah, Wuse II, Sango-Ota, 105102, Nsukka..."
              className="w-full rounded-full border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              autoComplete="off"
              spellCheck={false}
            />
            {q ? (
              <button
                type="button"
                onClick={() => setQ("")}
                className="inline-flex min-h-11 shrink-0 items-center rounded-full border bg-background px-3.5 text-xs font-semibold hover:border-primary hover:text-primary"
              >
                Clear
              </button>
            ) : null}
          </div>
        </label>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium text-muted-foreground">Try:</span>
          {QUICK_QUERIES.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setQ(sample)}
              className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${
                q.toLowerCase() === sample.toLowerCase()
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:border-primary hover:text-primary"
              }`}
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by geopolitical zone">
        <button
          type="button"
          onClick={() => setZone("all")}
          className={`min-h-9 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            zone === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:border-primary hover:text-foreground"
          }`}
        >
          All zones ({zoneCounts.all})
        </button>
        {POSTAL_GEOPOLITICAL_ZONES.map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZone(z)}
            className={`min-h-9 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              zone === z
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {z === "North-Central" ? "North-Central + FCT" : z} ({zoneCounts[z] ?? 0})
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {needle
          ? `Found ${matchedPlaces.length}${matchedPlaces.length === 24 ? "+" : ""} matching verified place${matchedPlaces.length === 1 ? "" : "s"} across ${filteredStates.length} of ${zonePool.length} states for “${q.trim()}”.`
          : `Showing ${filteredStates.length} state${filteredStates.length === 1 ? "" : "s"}${zone === "all" ? " + FCT" : ` in ${zone}`} · ${totalZonePlaces} verified NIPOST places.`}
      </p>

      {needle && matchedPlaces.length > 0 ? (
        <div className="space-y-2 rounded-xl border bg-background/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Direct verified place matches — tap Copy
            </h3>
            <span className="text-xs text-muted-foreground">6-digit NIPOST delivery codes</span>
          </div>
          <ul className="divide-y">
            {matchedPlaces.map(({ state: s, place: p, leafHref }) => (
              <li key={`${s.slug}:${p.slug ?? p.name}:${p.code}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-1 last:pb-1">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link
                      href={leafHref ?? `/codes/postal/${s.slug}`}
                      className="font-semibold underline-offset-2 hover:text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    <Badge variant="outline" className="text-[11px]">
                      {s.name}
                    </Badge>
                    {leafHref ? (
                      <Link href={leafHref} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                        District guide →
                      </Link>
                    ) : null}
                  </div>
                  {p.label ? <p className="text-xs text-muted-foreground">{p.label}</p> : null}
                  {p.notes ? <p className="text-[11px] text-muted-foreground">Note: {p.notes}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-base font-extrabold tabular-nums">{p.code}</span>
                  <CopyButton text={p.code} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {filteredStates.map((s) => (
          <li key={s.slug}>
            <Card className="h-full overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    <Link href={`/codes/postal/${s.slug}`} className="underline-offset-2 hover:text-primary hover:underline">
                      {s.name}
                    </Link>
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="accent">{s.headOfficeCode}</Badge>
                    <CopyButton text={s.headOfficeCode} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {s.capital} · {s.geopoliticalZone} · {s.places.length} verified places · {s.range ?? `${s.zoneCode}xxx`}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="line-clamp-2 text-xs text-muted-foreground">{s.intro}</p>
                <ul className="flex flex-wrap gap-1.5 text-xs">
                  {s.places.slice(0, 5).map((p) => (
                    <li key={p.code + p.name} className="rounded-full border bg-card/40 px-2 py-1 font-mono">
                      {p.code}{" "}
                      <span className="font-sans text-muted-foreground">
                        {p.name.split("—")[0].replace(/\s*\(.*?\)\s*/g, "").trim()}
                      </span>
                    </li>
                  ))}
                  {s.places.length > 5 ? (
                    <li className="px-2 py-1 text-xs text-muted-foreground">+{s.places.length - 5} more</li>
                  ) : null}
                </ul>
                <Link
                  href={`/codes/postal/${s.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  Open {s.name} — all {s.places.length} codes →
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
        {!filteredStates.length ? (
          <li className="col-span-full rounded-xl border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">No verified place or state matches “{q.trim()}” yet.</p>
            <p className="mt-1 text-xs">
              We never guess or invent 6-digit NIPOST codes. Clear your filter, open your state page to copy its{" "}
              <code>001</code> GPO head-office code, and write your full street and LGA in the address lines.
            </p>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
