import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { ChangeBadge } from "@/components/live/change-badge";
import { MiniSparkline } from "@/components/live/sparkline";
import { Freshness } from "@/components/live/freshness";
import { FxHistorySection } from "@/components/live/history-section";
import { ChartPointsTable } from "@/components/live/chart-points-table";
import { CHART_PAGES, chartPagePath } from "@/lib/chart-pages";
import { formatChartValue } from "@/lib/chart-series";
import { MAX_HISTORY_POINTS_PER_DATASET, datasetHistoryPoints, latestDatasetDelta } from "@/lib/live";
import { SITE_CONFIG } from "@/config/site";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { DATASET_REGISTRY, stateLabel } from "@/lib/source-registry";
import { formatWatFull } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  path: "/rates",
  title: "Naira to Dollar History & Rates in Nigeria — CBN Official vs Parallel Market",
  description:
    "Nigeria's naira to dollar history: CBN official NFEM vs parallel (black market) buy quote. Every stored reading explained, source-dated, no interpolation. Real gaps kept. How often checked, what is stored, what is not.",
  keywords: [
    "naira to dollar history",
    "parallel market rate chart Nigeria",
    "black market dollar rate history",
    "CBN official rate history",
    "NFEM dollar to naira",
    "dollar to naira archive",
  ],
});

const FX_FAQ = [
  {
    q: "Why are the official and parallel rates different?",
    a: "They are separate markets. The CBN NFEM rate is the official closing rate published by the Central Bank of Nigeria. The parallel buy quote is an indicative third-party quote from Aboki Forex reflecting street-market pricing. NaijaCheck never averages them and plots them on separate pages (with a shared naira-per-dollar axis only on the combined preview).",
  },
  {
    q: "How often does NaijaCheck check the rates?",
    a: "The monitor attempts every 3 hours, parsing the live source pages. A successful parse with a new source time and value is appended. A failed or unchanged check is recorded in health but does not create a new point. See /status for the latest check time, source time and verification state per dataset.",
  },
  {
    q: "What is stored and what is not?",
    a: "Stored: the last 56 verified observations per dataset (parallel USD buy and CBN USD), each with source time, recorded time, value and source URL from data/history.json. Not stored: fabricated backfill before 9 Oct 2026, interpolated values between readings, or guesses for days with no successful parse. Gaps on the time axis mean no reading was stored.",
  },
  {
    q: "Why might 7D or 30D be disabled on a chart?",
    a: "Timeframes filter only readings that actually exist. A range with fewer than two stored readings inside it stays disabled and explains why (e.g. 'Need 2 readings in last 7 days, have 1'). Use ALL to see every stored point, or wait for more checks.",
  },
  {
    q: "Can I see the full list of readings?",
    a: "Yes — each dedicated chart page has a table of every stored reading (time in WAT, value, change vs previous, source and verification state), newest first. The history charts also let you scrub to any point to read its exact value and delta.",
  },
];

function FaqBlock() {
  return (
    <section aria-labelledby="faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
      <h2 id="faq" className="text-xl font-bold">Frequently asked questions</h2>
      <div className="space-y-4">
        {FX_FAQ.map((f) => (
          <div key={f.q}>
            <h3 className="text-sm font-semibold">{f.q}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function RatesHubPage() {
  const parallelPoints = datasetHistoryPoints("parallel-usd-ngn-buy");
  const cbnPoints = datasetHistoryPoints("cbn-usd-ngn");
  const parallelLatest = parallelPoints.at(-1) ?? null;
  const cbnLatest = cbnPoints.at(-1) ?? null;
  const parallelDelta = latestDatasetDelta("parallel-usd-ngn-buy");
  const cbnDelta = latestDatasetDelta("cbn-usd-ngn");
  const parallelReg = DATASET_REGISTRY.find((d) => d.id === "parallel-fx")!;
  const cbnReg = DATASET_REGISTRY.find((d) => d.id === "cbn-usd")!;
  const collectionStart = "2026-10-09";
  const latestSourceTime = [parallelLatest?.sourceTime, cbnLatest?.sourceTime].filter(Boolean).sort().pop() as string | undefined;
  const earliestSourceTime = [parallelPoints[0]?.sourceTime, cbnPoints[0]?.sourceTime].filter(Boolean).sort()[0] as string | undefined;

  const fxChartPages = CHART_PAGES.filter((p) => p.dataset === "parallel-usd-ngn-buy" || p.dataset === "cbn-usd-ngn");
  const fuelChartPages = CHART_PAGES.filter((p) => p.dataset.startsWith("fuel-") || p.dataset.startsWith("fuel-depot"));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigeria FX rates & history", href: "/rates" }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">No fake history · only stored readings</Badge>
          <span className="text-xs font-medium text-muted-foreground">Archive grows as the monitor records real checks · {collectionStart} → today</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Naira to dollar history &amp; rates — CBN official vs parallel market</h1>
        <p className="text-muted-foreground">
          Nigeria has two widely quoted dollar rates: the <strong>CBN NFEM official closing rate</strong> and the{" "}
          <strong>indicative parallel (black market) buy quote</strong> from Aboki Forex. They are different markets, move at
          different times and are never averaged. This hub explains the difference, shows every stored reading’s chart and
          table, and links to the full history for each series. No point before {collectionStart} is claimed — the archive
          starts when automated collection started and grows only from real monitor parses.
        </p>
        <Freshness asOf={latestSourceTime ?? null} label="Latest FX source as of" source="CBN + Aboki Forex" state="recent" />
        <ShareControls placement="inline" title="Naira to dollar history — CBN vs parallel market" url={absUrl("/rates")} summary={`${parallelPoints.length + cbnPoints.length} stored FX readings · archive from ${collectionStart}`} />
      </header>

      <section aria-labelledby="why-different" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="why-different" className="text-xl font-bold">Why official ≠ parallel — and why we keep them separate</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>Official (CBN NFEM):</strong> the closing rate published on the CBN exchange-rate page (NGN per US$). Used for
            official settlements and as the reference the CBN reports. Checked via{" "}
            <a href="https://www.cbn.gov.ng/rates/ExchRateByCurrency.html" target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">CBN rates page</a>{" "}
            and its NFEM API. Only the NFEM-rate column and newest dated row are accepted — nearby numbers without the correct
            header are rejected.
          </li>
          <li>
            <strong>Parallel (Aboki buy):</strong> a third-party indicative buy quote from{" "}
            <a href="https://abokiforex.app/" target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">Aboki Forex</a>, with its own WAT timestamp. Not a CBN rate and not a guaranteed dealer price; dealers may quote
            differently street-by-street. We store buy (and separately track sell) as the source reports them.
          </li>
          <li>
            <strong>Never mixed:</strong> charts for each market have their own table and state badge. The combined FX preview on
            this page shares one NGN-per-US$ axis only because both are NGN per US$; their source tables are never merged into
            a single “naira price”.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          If you need the amount you will actually hand over today, confirm with your dealer or use the{" "}
          <Link href="/status" className="font-semibold text-primary underline underline-offset-2">/status</Link> source times to
          see when the last verified reading arrived.
        </p>
      </section>

      <section aria-labelledby="latest" className="grid gap-3 sm:grid-cols-2">
        <h2 id="latest" className="sr-only">Latest FX readings</h2>
        {[
          { label: "Parallel USD buy (Aboki)", points: parallelPoints, latest: parallelLatest, delta: parallelDelta, reg: parallelReg, slug: "parallel-usd-buy" as const, fractionDigits: 0, unit: "₦ per US$" },
          { label: "CBN official USD (NFEM)", points: cbnPoints, latest: cbnLatest, delta: cbnDelta, reg: cbnReg, slug: "cbn-usd" as const, fractionDigits: 2, unit: "₦ per US$" },
        ].map((item) => (
          <Card key={item.slug}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold">{item.label}</CardTitle>
                <Badge variant={item.reg.state === "live" || item.reg.state === "recent" ? "accent" : "muted"}>{stateLabel[item.reg.state]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{item.unit} · {item.points.length} / {MAX_HISTORY_POINTS_PER_DATASET} stored</p>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xl font-extrabold tabular-nums">
                  {item.latest ? formatChartValue(item.latest.value, item.fractionDigits) : "Unavailable"}
                </span>
                <ChangeBadge delta={item.delta} fractionDigits={item.fractionDigits} showNoPrior />
              </div>
              {item.latest ? (
                <p className="text-[11px] text-muted-foreground">
                  Source time {formatWatFull(Date.parse(item.latest.sourceTime))} · recorded {item.latest.observedAt.slice(0, 16).replace("T", " ")} UTC
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">No stored reading yet.</p>
              )}
              <MiniSparkline dataset={item.slug === "parallel-usd-buy" ? "parallel-usd-ngn-buy" : "cbn-usd-ngn"} label={item.label} tone={item.slug === "parallel-usd-buy" ? "primary" : "sky"} fractionDigits={item.fractionDigits} />
              <Link href={`/charts/${item.slug}`} className="inline-flex min-h-11 items-center text-xs font-semibold text-primary underline-offset-2 hover:underline">Open full chart &amp; table →</Link>
            </CardContent>
          </Card>
        ))}
      </section>

      <section aria-labelledby="fx-chart" className="space-y-3">
        <h2 id="fx-chart" className="text-xl font-bold">Combined FX chart — every stored point, no interpolation</h2>
        <p className="text-sm text-muted-foreground">
          The chart below draws both series from <code>data/history.json</code> only. Hover, scrub or focus it (← →, Home/End) — the
          crosshair snaps to the nearest stored reading, never between two. Time on the horizontal axis is the source’s own
          reading time, so a gap means a missing reading. 7D, 30D and ALL filter to readings that actually exist; a range with
          fewer than two points stays disabled and says why.
        </p>
        <FxHistorySection />
        <p className="text-xs text-muted-foreground">
          Want the bigger chart and the full table? <Link href="/charts/parallel-usd-buy" className="font-semibold text-primary underline underline-offset-2">Parallel USD buy chart</Link>
          {" · "}
          <Link href="/charts/cbn-usd" className="font-semibold text-primary underline underline-offset-2">CBN USD chart</Link>
          {" · "}
          <Link href="/charts" className="font-semibold text-primary underline-offset-2 hover:text-primary hover:underline">All charts</Link> · <Link href="/rates/history" className="font-semibold text-primary underline underline-offset-2">FX archive table (every stored reading)</Link>
        </p>
      </section>

      <section aria-labelledby="storage" className="space-y-2 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="storage" className="text-base font-bold">What is stored, retention &amp; storage impact</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <strong>Archive start:</strong> {collectionStart}. No reading before that is claimed — we do not backfill “dollar in
            2015” guesses from blogs.
          </li>
          <li>
            <strong>Retention:</strong> up to {MAX_HISTORY_POINTS_PER_DATASET} most recent verified observations per dataset, newest
            replaces oldest (rolling window). FX datasets grow independently, so heavy parallel updates never evict CBN points.
          </li>
          <li>
            <strong>When appended:</strong> only after a successful parse with a new sourceTime (or same sourceTime but different
            value). Duplicates and failed checks do not create points. Each point stores observedAt, sourceTime, value, unit,
            geography and sourceUrl.
          </li>
          <li>
            <strong>Storage:</strong> plain <code>data/history.json</code> committed in Git, copied to the static export. At
            maximum retention this file would be about 900 points × ~190 bytes ≈ 171 KB plus Git history — well within Workers
            Static Assets limits, ₦0, no paid DB, no KV, no external API.
          </li>
          <li>
            <strong>How often checked:</strong> attempted every 3 hours; upstream publication and deployment can delay when a new
            value appears on the site. Check <Link href="/status" className="font-semibold text-primary underline underline-offset-2">/status</Link> for the
            last check vs last source time per dataset and stale/seeded flags.
          </li>
        </ul>
        <p className="text-muted-foreground">
          The archive grows as the monitor records real checks — it is honest about what it does not yet have. If a chart’s 30D
          toggle is disabled, it lists how many points exist in that window.
        </p>
      </section>

      <section aria-labelledby="sources" className="space-y-3">
        <h2 id="sources" className="text-xl font-bold">How we source &amp; how to verify</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">CBN official (NFEM)</CardTitle>
              <p className="text-xs text-muted-foreground">Parsed from CBN exchange-rate table + NFEM API (NFEM-rate column only)</p>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <p>Stale after 36 hours without a new source time. “Live” only within ~4 hours of source publication.</p>
              <a href="https://www.cbn.gov.ng/rates/ExchRateByCurrency.html" target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">Open CBN rates page</a>
              <p className="text-muted-foreground">Method, cadence, limitation and health on <Link href="/status" className="font-semibold text-primary underline underline-offset-2">/status</Link>.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Parallel (Aboki indicative)</CardTitle>
              <p className="text-xs text-muted-foreground">Parsed “BUY / SELL per USD” lines and WAT timestamp from Aboki Forex</p>
            </CardHeader>
            <CardContent className="space-y-1 text-xs">
              <p>Stale after 12 hours. Never labelled a CBN rate or guaranteed dealer price.</p>
              <a href="https://abokiforex.app/" target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">Open Aboki Forex</a>
              <p className="text-muted-foreground">Method, cadence and limitation on <Link href="/status" className="font-semibold text-primary underline underline-offset-2">/status</Link>.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="chart-links" className="space-y-2">
        <h2 id="chart-links" className="text-xl font-bold">Open a full chart page (with table)</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {fxChartPages.map((page) => (
            <li key={page.slug}>
              <Link href={chartPagePath(page)} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary">
                <span className="font-semibold">{page.name}</span>
                <span className="text-xs text-muted-foreground">{datasetHistoryPoints(page.dataset).length} readings →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Fuel history lives separately: <Link href="/prices/fuel" className="font-semibold text-primary underline underline-offset-2">fuel depot history hub (/prices/fuel)</Link>
          {" · "}
          {fuelChartPages.map((p, i) => (
            <span key={p.slug}>{i ? " · " : null}<Link href={chartPagePath(p)} className="font-semibold text-primary underline-offset-2 hover:underline">{p.name}</Link></span>
          ))}
        </p>
      </section>

      <FaqBlock />

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><Link href="/status" className="font-semibold text-primary underline-offset-2 hover:underline">Data status &amp; source health</Link></li>
          <li><Link href="/charts" className="font-semibold text-primary underline-offset-2 hover:underline">All price charts</Link></li>
          <li><Link href="/prices/fuel" className="font-semibold text-primary underline-offset-2 hover:underline">Fuel depot history</Link></li>
          <li><Link href="/howto" className="font-semibold text-primary underline-offset-2 hover:underline">GovHowTo guides</Link></li>
          <li><Link href="/about" className="text-muted-foreground underline-offset-2 hover:underline">About NaijaCheck</Link></li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/rates", "Nigeria FX rates & history"),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Naira to Dollar History & Rates in Nigeria — CBN Official vs Parallel Market",
            description: "Nigeria naira to dollar history: CBN official NFEM vs parallel buy quote, every stored reading explained with source and retention.",
            url: absUrl("/rates"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            ...(earliestSourceTime && latestSourceTime ? { temporalCoverage: `${earliestSourceTime}/${latestSourceTime}` } : {}),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FX_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
    </div>
  );
}
