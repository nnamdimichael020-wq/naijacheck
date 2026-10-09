import Link from "next/link";
import { TrendingUp, Droplet, ArrowUpRight } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FUEL, RATES, SLANG_BY_SLUG, TRENDING_SLUGS, naira, DATA_DATE } from "@/lib/data";

/** Desktop-only sidebar: Trending Now, Today's Rates, related links, one sidebar ad. */
export function SiteSidebar() {
  const trending = TRENDING_SLUGS.map((s) => SLANG_BY_SLUG[s]).filter(Boolean).slice(0, 5);
  const diesel = FUEL.depots.find((d) => d.name.includes("National median depot (diesel)"));
  const petrolLagos = FUEL.petrolPump.find((p) => p.slug === "lagos");

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
            <Droplet className="size-4 text-accent" aria-hidden="true" /> Today&apos;s Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">USD official</dt>
              <dd className="font-semibold tabular-nums">₦{RATES.official.USD.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">USD black market</dt>
              <dd className="font-semibold tabular-nums">₦{RATES.blackMarket.USD.toLocaleString("en-NG")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Petrol, Lagos pump</dt>
              <dd className="font-semibold tabular-nums">{petrolLagos ? naira(petrolLagos.price) : "n/a"}/L</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Diesel, depot median</dt>
              <dd className="font-semibold tabular-nums">{diesel ? naira(diesel.price as number) : "n/a"}/L</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground">Indicative. Sourced {DATA_DATE}. GBP and EUR are derived.</p>
          <Link href="/prices" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            All prices <ArrowUpRight className="size-3.5" aria-hidden="true" />
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
