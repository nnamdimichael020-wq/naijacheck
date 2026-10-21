import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { FuelTables } from "@/components/prices/price-tables";
import { FuelHistorySection, LpgHistorySection } from "@/components/live/history-section";
import { ChartPointsTable } from "@/components/live/chart-points-table";
import { MAX_HISTORY_POINTS_PER_DATASET, datasetHistoryPoints } from "@/lib/live";
import { CHART_PAGES } from "@/lib/chart-pages";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";
import { absUrl } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbSchema } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { DATASET_REGISTRY, stateLabel } from "@/lib/source-registry";
import { Badge } from "@/components/ui/badge";

const article = getArticle("/prices/fuel");
export const metadata = articleMetadata(article);

const FUEL_FAQ = [
  {
    q: "Is the depot price what I pay at the pump?",
    a: "No. Depot/gantry prices are wholesale — what stations pay to lift fuel from depots. Pump prices include margins, transport, state levies and station markup, so they sit above the depot median. Use the petrol-by-state pump table for the retail reference and the depot history to see which way wholesale is moving.",
  },
  {
    q: "Why are petrol, diesel and LPG on separate charts?",
    a: "Petrol and diesel are both NGN per litre and can share one axis, but LPG (cooking gas) is NGN per kilogram. Mixing per-litre and per-kg on one axis would be dishonest, so LPG has its own chart and unit.",
  },
  {
    q: "Why might 7D or 30D be disabled?",
    a: "Timeframes show only readings that actually exist. A range with fewer than two stored readings inside it is disabled and says so. Use ALL to see every stored point.",
  },
  {
    q: "How do you source depot prices?",
    a: "The monitor parses published depot tables from Awajis (attributed to petroleumprice.ng) every 3 hours and calculates the national median per product. Each stored point carries sourceTime, observedAt, value and sourceUrl. See /status for the latest source time, check state and stale flags.",
  },
];

export default function FuelPage() {
  const petrolPoints = datasetHistoryPoints("fuel-depot-petrol");
  const dieselPoints = datasetHistoryPoints("fuel-depot-diesel");
  const lpgPoints = datasetHistoryPoints("fuel-depot-lpg");
  const fuelReg = DATASET_REGISTRY.find((d) => d.id === "fuel-depot")!;
  const petrolSpec = CHART_PAGES.find((p) => p.slug === "depot-petrol")!.spec;
  const dieselSpec = CHART_PAGES.find((p) => p.slug === "depot-diesel")!.spec;
  const lpgSpec = CHART_PAGES.find((p) => p.slug === "depot-lpg")!.spec;
  const earliest = [petrolPoints[0]?.sourceTime, dieselPoints[0]?.sourceTime, lpgPoints[0]?.sourceTime].filter(Boolean).sort()[0] as string | undefined;
  const latest = [petrolPoints.at(-1)?.sourceTime, dieselPoints.at(-1)?.sourceTime, lpgPoints.at(-1)?.sourceTime].filter(Boolean).sort().pop() as string | undefined;

  return (
    <ArticleView article={article}>
      <section aria-labelledby="fuel-tables" className="space-y-3">
        <h2 id="fuel-tables" className="text-2xl font-bold tracking-tight">
          The fuel numbers
        </h2>
        <p className="text-sm text-muted-foreground">
          Depot medians are wholesale gantry prices, not station pump prices. The pump table is the retail list you pay at
          the station; the depot charts are the wholesale market that feeds it. They move at different times and are never
          averaged together.
        </p>
        <FuelTables />
        <p className="text-xs text-muted-foreground">
          The pump list above is a dated manual retail reference (NNPC list, 9 Oct 2026). Depot medians are auto-monitored
          wholesale values that update when the source publishes. For source health and stale flags, see{" "}
          <Link href="/status" className="font-semibold text-primary underline underline-offset-2">
            /status
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="fuel-history" className="space-y-3">
        <h2 id="fuel-history" className="text-2xl font-bold tracking-tight">
          Depot median history — every stored wholesale reading
        </h2>
        <p className="text-sm text-muted-foreground">
          These charts plot only the wholesale depot readings the monitor actually recorded — up to the last{" "}
          {MAX_HISTORY_POINTS_PER_DATASET} observations per dataset (archive from 2026-10-09, no backfill). A dataset with
          fewer than two stored readings shows an empty state rather than a drawn line, and gaps on the time axis are real
          gaps. Depot medians are wholesale gantry prices, not station pump prices.{" "}
          <Badge variant={fuelReg.state === "live" || fuelReg.state === "recent" ? "accent" : "muted"}>{stateLabel[fuelReg.state]}</Badge>
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          <FuelHistorySection />
          <LpgHistorySection />
        </div>
        <p className="text-xs text-muted-foreground">
          Prefer a bigger, scrubbable chart with the full stored-readings table?{" "}
          <Link href="/charts/depot-petrol" className="font-semibold text-primary underline underline-offset-2">
            Depot petrol chart
          </Link>
          {", "}
          <Link href="/charts/depot-diesel" className="font-semibold text-primary underline underline-offset-2">
            depot diesel chart
          </Link>
          {", "}
          <Link href="/charts/depot-lpg" className="font-semibold text-primary underline underline-offset-2">
            LPG chart
          </Link>
          {" · "}
          <Link href="/charts" className="font-semibold text-primary underline underline-offset-2">
            all charts
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="fuel-tables-full" className="space-y-4">
        <h2 id="fuel-tables-full" className="text-2xl font-bold tracking-tight">
          Every stored depot reading — newest first
        </h2>
        <p className="text-sm text-muted-foreground">
          The same rows the charts are drawn from, newest first. Each row shows WAT time, value, change vs previous,
          source and current verification state. Use these tables to see how many readings exist for 7D/30D.
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-base font-bold">Petrol depot median — {petrolPoints.length} readings</h3>
            <ChartPointsTable id="table-fuel-petrol-hub" spec={petrolSpec} points={petrolPoints} maxPoints={MAX_HISTORY_POINTS_PER_DATASET} sourceName={petrolSpec.sourceName ?? fuelReg.sourceName} sourceUrl={petrolSpec.sourceUrl ?? fuelReg.sourceUrl} currentStateLabel={stateLabel[fuelReg.state]} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold">Diesel depot median — {dieselPoints.length} readings</h3>
            <ChartPointsTable id="table-fuel-diesel-hub" spec={dieselSpec} points={dieselPoints} maxPoints={MAX_HISTORY_POINTS_PER_DATASET} sourceName={dieselSpec.sourceName ?? fuelReg.sourceName} sourceUrl={dieselSpec.sourceUrl ?? fuelReg.sourceUrl} currentStateLabel={stateLabel[fuelReg.state]} />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold">LPG depot median (per kg) — {lpgPoints.length} readings</h3>
            <ChartPointsTable id="table-fuel-lpg-hub" spec={lpgSpec} points={lpgPoints} maxPoints={MAX_HISTORY_POINTS_PER_DATASET} sourceName={lpgSpec.sourceName ?? fuelReg.sourceName} sourceUrl={lpgSpec.sourceUrl ?? fuelReg.sourceUrl} currentStateLabel={stateLabel[fuelReg.state]} />
          </div>
        </div>
      </section>

      <section aria-labelledby="how-fuel" className="space-y-2 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="how-fuel" className="text-base font-bold">
          How we source fuel, how often we check &amp; retention
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <strong>Source:</strong> published depot tables on{" "}
            <a href="https://awajis.com/fuel-price-in-nigeria-today/" target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">
              Awajis (petroleumprice.ng depot data)
            </a>
            . The monitor parses the tables and computes the national median per product (petrol, diesel, LPG).
          </li>
          <li>
            <strong>Cadence:</strong> attempted every 3 hours. A new point is stored only when the source time changes or the
            value changes; duplicates are ignored.
          </li>
          <li>
            <strong>Retention:</strong> up to {MAX_HISTORY_POINTS_PER_DATASET} most recent verified observations per fuel
            dataset. Archive from 2026-10-09 — no “1999 petrol price” is backfilled. Gaps = no successful parse at that time.
          </li>
          <li>
            <strong>Storage:</strong> <code>data/history.json</code> (committed file, ~190 bytes per point). At full
            retention for 5 datasets the file is about 171 KB — zero-cost, no paid DB, no KV.
          </li>
          <li>
            <strong>Pump ≠ depot:</strong> depot medians are wholesale gantry prices. The petrol-by-state table is a
            separate dated retail list (manual, not auto-monitored) — confirm at the pump.
          </li>
          <li>
            <strong>Verify:</strong> source time, check time, stale/seeded flags and limitations live on{" "}
            <Link href="/status" className="font-semibold text-primary underline underline-offset-2">
              /status
            </Link>
            .
          </li>
        </ul>
        <p className="text-muted-foreground">
          Related: <Link href="/rates" className="font-semibold text-primary underline underline-offset-2">FX rates &amp; history hub (/rates)</Link>
          {" · "}
          <Link href="/rates/history" className="font-semibold text-primary underline underline-offset-2">FX archive</Link>
          {" · "}
          <Link href="/prices/generator-diesel" className="font-semibold text-primary underline underline-offset-2">Generator diesel guide</Link>
          {" · "}
          <Link href="/tools/generator" className="font-semibold text-primary underline underline-offset-2">Generator calculator</Link>
          {" · "}
          <Link href="/charts/depot-petrol" className="font-semibold text-primary underline underline-offset-2">Petrol chart</Link>
        </p>
      </section>

      <section aria-labelledby="fuel-faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="fuel-faq" className="text-xl font-bold">Frequently asked questions</h2>
        <div className="space-y-4">
          {FUEL_FAQ.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/prices/fuel", "Dated fuel references"),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Nigeria Fuel References: Pump Lists & Depot Monitoring — NaijaCheck",
            description: "Fuel depot history: wholesale PMS/diesel/LPG medians with every stored reading, source and retention, plus dated pump list.",
            url: absUrl("/prices/fuel"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            ...(earliest && latest ? { temporalCoverage: `${earliest}/${latest}` } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FUEL_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
    </ArticleView>
  );
}
