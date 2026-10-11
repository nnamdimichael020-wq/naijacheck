import Link from "next/link";
import { Activity, ArrowRight, ExternalLink, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChangeBadge } from "@/components/live/change-badge";
import { Freshness } from "@/components/live/freshness";
import { LIVE_FEEDS, LIVE_FUEL, LIVE_FX, latestDatasetDelta, latestHeadlines } from "@/lib/live";
import { DATASET_REGISTRY, stateLabel, type VerificationState } from "@/lib/source-registry";
import { RATES, naira } from "@/lib/data";
import { cn } from "@/lib/utils";

const WAT_FORMAT = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatWatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Timestamp unavailable";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "Timestamp unavailable";
  return `${WAT_FORMAT.format(new Date(ms))} WAT`;
}

function statusBadgeStyle(state: VerificationState): string {
  switch (state) {
    case "live":
    case "recent":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200";
    case "stale":
    case "seeded":
      return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200";
    case "manual":
      return "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200";
    case "unavailable":
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

const HUB_LINKS = [
  { href: "/prices", label: "Food & City Prices" },
  { href: "/prices/fuel", label: "Fuel & Depot" },
  { href: "/trends", label: "Slang & Trends" },
  { href: "/hustle", label: "Hustle Blueprints" },
  { href: "/howto", label: "GovHowTo" },
  { href: "/exam", label: "Exam Hub" },
  { href: "/telecom", label: "Telecom" },
  { href: "/tools", label: "Calculators" },
  { href: "/status", label: "Data Status" },
];

export function DailyBriefing() {
  const parallelRecord = DATASET_REGISTRY.find((d) => d.id === "parallel-fx")!;
  const cbnRecord = DATASET_REGISTRY.find((d) => d.id === "cbn-usd")!;
  const fuelRecord = DATASET_REGISTRY.find((d) => d.id === "fuel-depot")!;
  const headlinesRecord = DATASET_REGISTRY.find((d) => d.id === "headlines")!;

  const parallelBuy = LIVE_FX.blackMarket?.USD.buy ?? RATES.blackMarket.USD ?? null;
  const parallelSell = LIVE_FX.blackMarket?.USD.sell ?? null;
  const cbnUsd = LIVE_FX.official.USD ?? RATES.official.USD ?? null;
  const petrolMedian = LIVE_FUEL.medians.petrol;

  const parallelDelta = latestDatasetDelta("parallel-usd-ngn-buy");
  const cbnDelta = latestDatasetDelta("cbn-usd-ngn");
  const petrolDelta = latestDatasetDelta("fuel-depot-petrol");

  const headlines = latestHeadlines(3);

  const metrics = [
    {
      id: "parallel-usd",
      title: "Parallel USD (buy quote)",
      subtitle: parallelSell ? `Sell quote: ₦${parallelSell.toLocaleString("en-NG")}/$` : "Indicative dealer quote, not CBN",
      value: parallelBuy ? `₦${parallelBuy.toLocaleString("en-NG")}` : "Unavailable",
      unit: "/US$",
      state: parallelRecord.state,
      sourceName: parallelRecord.sourceName,
      sourceUrl: parallelRecord.sourceUrl,
      sourceTime: parallelRecord.sourceTime,
      delta: parallelDelta,
      unitSuffix: "",
      fractionDigits: 0,
      href: "/prices",
    },
    {
      id: "depot-petrol",
      title: "Depot petrol median (PMS)",
      subtitle: "Wholesale gantry median, not station pump price",
      value: petrolMedian ? naira(petrolMedian) : "Unavailable",
      unit: petrolMedian ? "/L" : "",
      state: fuelRecord.state,
      sourceName: fuelRecord.sourceName,
      sourceUrl: fuelRecord.sourceUrl,
      sourceTime: fuelRecord.sourceTime,
      delta: petrolDelta,
      unitSuffix: "/L",
      fractionDigits: undefined,
      href: "/prices/fuel",
    },
    {
      id: "cbn-usd",
      title: "Official USD (CBN NFEM)",
      subtitle: "Official closing rate, separate from parallel market",
      value: cbnUsd ? `₦${cbnUsd.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Unavailable",
      unit: "/US$",
      state: cbnRecord.state,
      sourceName: cbnRecord.sourceName,
      sourceUrl: cbnRecord.sourceUrl,
      sourceTime: cbnRecord.sourceTime,
      delta: cbnDelta,
      unitSuffix: "",
      fractionDigits: 2,
      href: "/status",
    },
  ];

  return (
    <section
      aria-labelledby="daily-briefing-heading"
      className="rounded-2xl border border-primary/25 bg-card p-3.5 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="daily-briefing-heading" className="text-base font-extrabold tracking-tight sm:text-lg">
              Daily Naija Briefing
            </h2>
            <p className="text-xs text-muted-foreground">
              Every figure shows its verification status, named source, and WAT timestamp.
            </p>
          </div>
        </div>
        <Link
          href="/status"
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          Verify sources &amp; /status <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>

      {/* Monitored FX & Fuel cards */}
      <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.id} className="border-border/80 bg-background/60 shadow-none">
            <CardContent className="flex h-full flex-col justify-between gap-2.5 p-3.5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <Link href={m.href} className="text-xs font-semibold text-foreground hover:text-primary hover:underline">
                    {m.title}
                  </Link>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                      statusBadgeStyle(m.state),
                    )}
                    title={stateLabel[m.state]}
                  >
                    {m.state}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-2 pt-0.5">
                  <p className="text-2xl font-extrabold tabular-nums tracking-tight sm:text-[26px]">
                    {m.value}
                    {m.unit ? <span className="ml-0.5 text-xs font-normal text-muted-foreground">{m.unit}</span> : null}
                  </p>
                  <ChangeBadge
                    delta={m.delta}
                    unitSuffix={m.unitSuffix}
                    fractionDigits={m.fractionDigits}
                    showNoPrior={true}
                  />
                </div>

                <p className="text-[11px] text-muted-foreground">{m.subtitle}</p>
              </div>

              <div className="space-y-1 border-t pt-2 text-[11px] text-muted-foreground">
                <p className="font-medium text-foreground/85">
                  Source:{" "}
                  {m.sourceUrl ? (
                    <a
                      href={m.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="underline decoration-border underline-offset-2 hover:text-primary"
                    >
                      {m.sourceName}
                    </a>
                  ) : (
                    m.sourceName
                  )}{" "}
                  · <span className="lowercase">{stateLabel[m.state]}</span>
                </p>
                <Freshness
                  asOf={m.sourceTime}
                  label="Source as of"
                  state={m.state}
                  className="text-[11px]"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3 Real Monitored Headlines */}
      <div className="mt-4 rounded-xl border bg-background/50 p-3 sm:p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-1.5">
            <Newspaper className="size-4 text-primary" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
              Top 3 Monitored Headlines
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                statusBadgeStyle(headlinesRecord.state),
              )}
            >
              {headlinesRecord.state}
            </span>
            <span>Source: {headlinesRecord.sourceName}</span>
            <span>· Checked as of {formatWatTimestamp(LIVE_FEEDS.checkedAt)}</span>
          </div>
        </div>

        {headlines.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            No monitored headlines available right now. Check <Link href="/status" className="font-semibold text-primary underline">/status</Link> for feed health.
          </p>
        ) : (
          <ol className="divide-y text-sm">
            {headlines.map((item) => (
              <li key={item.link + item.title} className="py-2 first:pt-1 last:pb-0.5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-medium leading-snug text-foreground hover:text-primary hover:underline"
                    >
                      {item.title}
                      <ExternalLink className="ml-1 inline size-3 align-[-1px] opacity-60" aria-hidden="true" />
                    </a>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground/80">Source: {item.source || "Publisher"}</span>
                      <span>·</span>
                      <span>Status: {headlinesRecord.state}</span>
                      <span>·</span>
                      <span>As of {formatWatTimestamp(item.published)}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit shrink-0 text-[10px]">
                    {item.topic}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Quick links to /status and main hubs */}
      <nav aria-label="Main hubs and data status" className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-1">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">Hubs:</span>
        {HUB_LINKS.map((hub) => (
          <Link
            key={hub.href}
            href={hub.href}
            className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {hub.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}
