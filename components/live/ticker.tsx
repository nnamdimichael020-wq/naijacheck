import Link from "next/link";
import { FUEL, RATES, naira } from "@/lib/data";
import { LIVE_FX, LIVE_FUEL, LIVE_TRENDS } from "@/lib/live";

type Item = { label: string; value: string; href?: string };

/**
 * Sticky live ticker under the header. Values come from the latest monitor run. The ticker repeats
 * its items so the scroll loops, and it stops for visitors who ask for reduced motion.
 */
export function LiveTicker() {
  const usdOfficial = LIVE_FX.official.USD ?? RATES.official.USD;
  const usdBlack = LIVE_FX.blackMarket?.USD.buy ?? RATES.blackMarket.USD;
  const gbpBlack = LIVE_FX.blackMarket?.GBP?.buy;
  const petrol = LIVE_FUEL.medians.petrol ?? FUEL.depots.find((d) => d.name.includes("(petrol)"))?.price;
  const diesel = LIVE_FUEL.medians.diesel ?? FUEL.depots.find((d) => d.name.includes("(diesel"))?.price;
  const lpg = LIVE_FUEL.medians.lpg;
  const trend = LIVE_TRENDS.terms.find((t) => t.score > 0);

  const items: Item[] = [
    { label: "USD official (CBN)", value: naira(usdOfficial), href: "/prices/cost-of-living" },
    { label: "USD black market", value: naira(usdBlack), href: "/prices/cost-of-living" },
    ...(gbpBlack ? [{ label: "GBP black market", value: naira(gbpBlack) }] : []),
    { label: "Petrol depot median /L", value: naira(petrol ?? 0), href: "/prices/fuel" },
    { label: "Diesel depot median /L", value: naira(diesel ?? 0), href: "/prices/fuel" },
    ...(lpg ? [{ label: "Cooking gas depot /kg", value: naira(lpg) }] : []),
    ...(trend ? [{ label: "Trending now", value: trend.term, href: `/trends/${trend.slug}` }] : []),
  ];
  const loop = [...items, ...items];

  return (
    <div className="border-b bg-secondary/60 text-xs" role="region" aria-label="Live rates ticker">
      <style>{`
        @keyframes nc-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .nc-ticker-track { animation: nc-ticker 60s linear infinite; }
        .nc-ticker:hover .nc-ticker-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .nc-ticker-track { animation: none; } }
      `}</style>
      <div className="nc-ticker mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-2">
        <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 font-bold uppercase tracking-wide text-primary-foreground">Live</span>
        <div className="overflow-hidden whitespace-nowrap">
          <ul className="nc-ticker-track flex w-max items-center gap-6">
            {loop.map((it, i) => (
              <li key={`${it.label}-${i}`} className="flex items-center gap-1.5" aria-hidden={i >= items.length || undefined}>
                <span className="text-muted-foreground">{it.label}</span>
                {it.href ? (
                  <Link href={it.href} className="font-semibold tabular-nums text-foreground hover:text-primary" tabIndex={i >= items.length ? -1 : 0}>
                    {it.value}
                  </Link>
                ) : (
                  <span className="font-semibold tabular-nums text-foreground">{it.value}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
