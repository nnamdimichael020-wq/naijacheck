"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Radio, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MonitorTerm = { slug: string; term: string; trendScore: number; trend: string };
type DecoderEntry = { slug: string; term: string; meaning: string; kind: "slang" | "psych" };
type Platform = "X" | "TikTok";
type Signal = { id: number; slug: string; term: string; platform: Platform; mentions: number; sentiment: "positive" | "mixed" | "negative" };

const SENTIMENTS: Signal["sentiment"][] = ["positive", "mixed", "negative"];
const PLATFORMS: Platform[] = ["X", "TikTok"];

/**
 * SIMULATED trend monitor. It models what listening to X and TikTok might look like for the
 * terms in our index. It is not connected to either platform and every number is illustrative.
 */
export function TrendMonitor({ terms, decoder }: { terms: MonitorTerm[]; decoder: DecoderEntry[] }) {
  const [volumes, setVolumes] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(terms.map((t) => [t.slug, t.trendScore * 1200])),
  );
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [paused, setPaused] = React.useState(false);
  const [filter, setFilter] = React.useState<"All" | Platform>("All");
  const [query, setQuery] = React.useState("");
  const nextId = React.useRef(1);

  React.useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      // Weight the pick by trend score, so hotter terms show up more often.
      const total = terms.reduce((s, t) => s + t.trendScore, 0);
      let roll = Math.random() * total;
      const pick = terms.find((t) => (roll -= t.trendScore) <= 0) ?? terms[0];
      const platform: Platform = Math.random() < 0.55 ? "TikTok" : "X";
      const mentions = Math.round(40 + Math.random() * 360);
      const sentiment = SENTIMENTS[Math.floor(Math.random() * SENTIMENTS.length)];
      setVolumes((v) => ({ ...v, [pick.slug]: (v[pick.slug] ?? 0) + mentions }));
      setSignals((s) => [{ id: nextId.current++, slug: pick.slug, term: pick.term, platform, mentions, sentiment }, ...s].slice(0, 10));
    }, 3500);
    return () => window.clearInterval(timer);
  }, [paused, terms]);

  const visibleSignals = signals.filter((s) => filter === "All" || s.platform === filter);
  const q = query.trim().toLowerCase();
  const matches = q
    ? decoder.filter((d) => d.term.toLowerCase().includes(q) || d.meaning.toLowerCase().includes(q)).slice(0, 8)
    : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="size-5 text-primary" aria-hidden="true" /> Live chatter monitor
            </CardTitle>
            <Badge variant="accent">Simulated</Badge>
          </div>
          <CardDescription>
            This panel <strong>simulates</strong> what monitoring X and TikTok could show. It is not connected to either platform, and the numbers are
            illustrative.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {(["All", ...PLATFORMS] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={filter === p}
                onClick={() => setFilter(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  filter === p ? "border-primary bg-primary/15 text-primary" : "border-input text-muted-foreground hover:bg-secondary",
                )}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPaused((x) => !x)}
              className="ml-auto rounded-full border border-input px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary"
              aria-pressed={paused}
            >
              {paused ? "Resume feed" : "Pause feed"}
            </button>
          </div>

          <ul className="space-y-3">
            {[...terms]
              .sort((a, b) => (volumes[b.slug] ?? 0) - (volumes[a.slug] ?? 0))
              .map((t) => {
                const vol = volumes[t.slug] ?? 0;
                const max = Math.max(...terms.map((x) => volumes[x.slug] ?? 0));
                const pct = Math.max(4, Math.round((vol / max) * 100));
                return (
                  <li key={t.slug} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/trends/${t.slug}`} className="font-semibold hover:text-primary">
                        {t.term}
                      </Link>
                      <span className="text-xs tabular-nums text-muted-foreground">{vol.toLocaleString("en-NG")} mentions/hr (sim)</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Trend status: {t.trend}. Editorial index {t.trendScore}/100.
                    </p>
                  </li>
                );
              })}
          </ul>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Activity className="size-4 text-primary" aria-hidden="true" /> Simulated signal feed
            </h3>
            {visibleSignals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Waiting for the next simulated signal…</p>
            ) : (
              <ol className="space-y-1.5" aria-live="off">
                {visibleSignals.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/60 px-3 py-2 text-xs">
                    <span>
                      <span className="font-semibold">{s.term}</span> on {s.platform}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      +{s.mentions} · {s.sentiment}
                    </span>
                  </li>
                ))}
              </ol>
            )}
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
