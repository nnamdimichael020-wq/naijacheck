import Link from "next/link";
import { TrendingUp, Droplet, ArrowUpRight } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Freshness } from "@/components/live/freshness";
import { LIVE_FUEL, LIVE_FX } from "@/lib/live";
import { DATASET_REGISTRY } from "@/lib/source-registry";
import { RATES, SLANG_BY_SLUG, TRENDING_SLUGS, naira } from "@/lib/data";

/** Desktop-only sidebar: Trending Now, Monitored FX & Depot Fuel, related links, one sidebar ad. */
export function SiteSidebar() {
  const trending = TRENDING_SLUGS.map((s) => SLANG_BY_SLUG[s]).filter(Boolean).slice(0, 5);
  const official = LIVE_FX.official.USD ?? RATES.official.USD;
  const parallel = LIVE_FX.blackMarket?.USD.buy ?? RATES.blackMarket.USD;
  const petrolMedian = LIVE_FUEL.medians.petrol;
  const dieselMedian = LIVE_FUEL.medians.diesel;

  const officialFxRecord = DATASET_REGISTRY.find((d) => d.id === "cbn-usd")!;
  const parallelFxRecord = DATASET_REGISTRY.find((d) => d.id === "parallel-fx")!;
  const fuelRecord = DATASET_REGISTRY.find((d) => d.id === "fuel-depot")!;

  return (
    <div className="sticky top-40 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-accent" aria-hidden="true" /> Trending Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {trending.map((t, i) => (
              <li key={t.slug}>
                <Link href={`/trends/${t.slug}`} className="group flex items-center justify-between gap-2 rounded-md p-1.5 text-sm hover:bg-secondary">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 text-xs text-muted-foreground">{i + 1}</span>
                    <span className="truncate font-medium group-hover:text-primary">{t.term}</span>
                  </span>
                  <Badge variant="muted">{t.trendScore}</Badge>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[11px] text-muted-foreground">Trend scores are editorial, from our weekly review.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplet className="size-4 text-accent" aria-hidden="true" /> Monitored FX &amp; Depot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2.5 text-sm">
            <div className="space-y-0.5">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">USD official (CBN)</dt>
                <dd className="font-semibold tabular-nums">₦{official.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</dd>
              </div>
              <Freshness asOf={officialFxRecord.sourceTime} state={officialFxRecord.state} source="CBN" className="text-[11px]" />
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">USD parallel quote</dt>
                <dd className="font-semibold tabular-nums">₦{parallel.toLocaleString("en-NG")}</dd>
              </div>
              <Freshness asOf={parallelFxRecord.sourceTime} state={parallelFxRecord.state} source="Aboki" className="text-[11px]" />
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Petrol, depot median</dt>
                <dd className="font-semibold tabular-nums">{petrolMedian ? naira(petrolMedian) : "n/a"}/L</dd>
              </div>
              <Freshness asOf={fuelRecord.sourceTime} state={fuelRecord.state} source="Awajis" className="text-[11px]" />
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Diesel, depot median</dt>
                <dd className="font-semibold tabular-nums">{dieselMedian ? naira(dieselMedian) : "n/a"}/L</dd>
              </div>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Wholesale depot ≠ station pump. Source timestamps &amp; health on{" "}
            <Link href="/status" className="font-medium text-primary hover:underline">
              /status
            </Link>
            .
          </p>
          <Link href="/rates" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            FX &amp; fuel charts <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Related</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link className="hover:text-primary" href="/prices/cost-of-living">
                How far will ₦80k go?
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/tools/generator">
                Generator fuel calculator
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/exam/jamb-cutoff-2026">
                JAMB cut-off 2026
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/howto/passport-renewal-2026">
                Passport renewal 2026
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary" href="/telecom/cheapest-data-this-week">
                Cheapest data this week
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>

      <AdSlot variant="sidebar" />
    </div>
  );
}
