"use client";

import * as React from "react";
import Link from "next/link";
import { BarChart3, Globe, Search, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Freshness } from "@/components/live/freshness";
import { cn } from "@/lib/utils";

export type MonitorTerm = {
  slug: string;
  term: string;
  trendScore: number;
  trend: string;
  mentions7d?: number;
};
export type DecoderEntry = { slug: string; term: string; meaning: string; kind: "slang" | "psych" };
export type WikiSignal = { article: string; views7d: number; prev7d: number; changePct: number | null };

/**
 * Live trend board. The numbers are counts from public news and Wikipedia pageviews, refreshed by the
 * monitor every three hours. X and TikTok are not read here. Those need a paid API, and we say so.
 */
export function TrendMonitor({
  terms,
  decoder,
  wiki,
  checkedAt,
  live,
  method,
}: {
  terms: MonitorTerm[];
  decoder: DecoderEntry[];
  wiki: WikiSignal[];
  checkedAt: string | null;
  live: boolean;
  method?: string;
}) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? decoder.filter((d) => d.term.toLowerCase().includes(q) || d.meaning.toLowerCase().includes(q)).slice(0, 8)
    : [];
  const ranked = [...terms].sort((a, b) => b.trendScore - a.trendScore || (b.mentions7d ?? 0) - (a.mentions7d ?? 0));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="size-5 text-primary" aria-hidden="true" /> Live trend board
            </CardTitle>
            <Badge variant={live ? "accent" : "muted"}>{live ? "Live" : "Not yet checked"}</Badge>
          </div>
          <CardDescription>
            {live
              ? "Ranked by how often each term appears in Nigerian news in the last 7 days, and checked against Wikipedia pageviews."
              : "The first live check has not run yet. Scores below are editorial and are marked as such."}
          </CardDescription>
          <Freshness asOf={checkedAt} label="Checked" source="Google News, Wikipedia" />
        </CardHeader>
        <CardContent className="space-y-5">
          <ul className="space-y-3">
            {ranked.map((t) => {
              const pct = Math.max(3, t.trendScore);
              const Icon = t.trend === "rising" ? TrendingUp : t.trend === "quiet" ? TrendingDown : Minus;
              return (
                <li key={t.slug} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/trends/${t.slug}`} className="font-semibold hover:text-primary">
                      {t.term}
                    </Link>
                    <span className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                      <Icon className="size-3.5" aria-hidden="true" />
                      {live && typeof t.mentions7d === "number"
                        ? `${t.mentions7d} mention${t.mentions7d === 1 ? "" : "s"} in 7 days`
                        : "not yet checked"}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {live ? `Score ${t.trendScore}/100 · ${t.trend}` : `Editorial index ${t.trendScore}/100 (not live)`}
                  </p>
                </li>
              );
            })}
          </ul>

          {wiki.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Wikipedia attention, last 7 days</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {wiki.map((w) => (
                  <li key={w.article} className="flex items-center justify-between gap-2 rounded-md bg-secondary/60 px-3 py-2 text-xs">
                    <span className="font-medium">{w.article}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {w.views7d.toLocaleString("en-NG")} views
                      {w.changePct !== null ? (
                        <span className={cn("ml-1.5 font-semibold", w.changePct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          {w.changePct >= 0 ? "+" : ""}
                          {w.changePct}%
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            <Globe className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              <strong className="text-foreground">Not included: X and TikTok.</strong> Reading those platforms needs a paid API and their terms
              restrict scraping, so this board does not show them. {method ? method : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="size-5 text-primary" aria-hidden="true" /> Decode a word
          </CardTitle>
          <CardDescription>Type a term or a feeling. Slang and relationship entries both show up here.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="decoder" className="sr-only">
              Search slang and relationship terms
            </label>
            <Input id="decoder" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. kelebu, gaslighting, wahala" />
          </div>
          {q && matches.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet. Try “wahala” or “shakara”.</p> : null}
          <ul className="space-y-2">
            {(q ? matches : decoder.slice(0, 6)).map((d) => (
              <li key={d.slug}>
                <Link href={`/trends/${d.slug}`} className="block rounded-lg border p-3 hover:border-primary hover:bg-secondary">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{d.term}</span>
                    <Badge variant="muted">{d.kind === "psych" ? "Relationship" : "Slang"}</Badge>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{d.meaning}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
