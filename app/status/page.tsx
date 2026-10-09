import type { Metadata } from "next";
import { SITE_CONFIG } from "@/config/site";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Freshness } from "@/components/live/freshness";
import { LIVE_WATCH, sourceHealth } from "@/lib/live";
import { DATASET_REGISTRY, stateLabel } from "@/lib/source-registry";
import { pageMetadata } from "@/lib/seo";
import { HistoryChart } from "@/components/live/history-chart";

export const metadata: Metadata = pageMetadata({
  path: "/status",
  title: "Data status",
  description: "Where monitored NaijaCheck readings come from, when sources were read, and which datasets are seeded, manual, stale or unavailable.",
  keywords: ["naijacheck data status", "live naira rate source", "fuel depot price source"],
});

const NOT_AUTO = [
  "Food basket prices by city (rice, garri, beans, yam, eggs). No free, reliable daily feed exists. Figures carry their survey date.",
  "NNPC and state pump prices. Pump prices are not read automatically. The depot medians above are wholesale prices.",
  "Telecom data bundles (MTN, Airtel, Glo, 9mobile). Operators change bundles without notice. Confirm on your network's USSD code.",
  "Passport, NIN and other official fees. The watch below flags when an official page changes, but a person must read it before a fee is changed.",
  "Exam cut-off marks and admission dates. Watched through the JAMB page and news headlines. Final values are set by the institution.",
  "Slang meanings and relationship-term explanations. These are written content. The trend counts are automatic.",
];

export default function StatusPage() {
  const health = sourceHealth();
  const watch = Object.entries(LIVE_WATCH.pages ?? {});
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Data status</h1>
        <p className="text-muted-foreground">
          Monitored readings on {SITE_CONFIG.name} have a named source and separate source and check times. This page distinguishes seeded,
          recent, stale, manual and unavailable data; a scheduled check does not guarantee that an upstream publisher changed its value.
        </p>
      </header>

      <section aria-labelledby="ds" className="space-y-3">
        <h2 id="ds" className="text-xl font-bold">
          Datasets
        </h2>
        <ul className="divide-y rounded-xl border">
          {DATASET_REGISTRY.map((d) => (
            <li key={d.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{d.label}</span>
                <Badge variant={d.state === "live" || d.state === "recent" ? "accent" : "muted"}>{stateLabel[d.state]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{d.geography} · {d.productType}{d.unit ? ` · ${d.unit}` : ""}</p>
              <Freshness asOf={d.sourceTime} label="Source as of" source={d.sourceName} />
              <p className="text-xs text-muted-foreground">
                Checked: {d.checkedAt ? `${new Date(d.checkedAt).toISOString().slice(0, 16).replace("T", " ")} UTC` : "no recorded check"}. {d.cadence}
              </p>
              <p className="text-xs text-muted-foreground">Method: {d.method} Limitation: {d.limitation}</p>
              {d.sourceUrl ? <a className="break-all text-xs font-medium text-primary hover:underline" href={d.sourceUrl} rel="nofollow noopener" target="_blank">Open source</a> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="history" className="space-y-3">
        <h2 id="history" className="text-xl font-bold">Price history</h2>
        <HistoryChart />
      </section>

      <section aria-labelledby="src" className="space-y-3">
        <h2 id="src" className="text-xl font-bold">
          Source health
        </h2>
        {health.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No monitor run has been recorded yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {health.map((h) => (
              <li key={h.key} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium">{h.key}</span>
                <span className="text-sm text-muted-foreground">
                  {h.ok ? (
                    <Badge variant="accent">Read OK</Badge>
                  ) : (
                    <Badge variant="outline">Failed, last good value kept</Badge>
                  )}{" "}
                  <span className="ml-2 tabular-nums">checked {new Date(h.checkedAt).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
                  {h.error ? <span className="ml-2 text-xs">({h.error})</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="watch" className="space-y-3">
        <h2 id="watch" className="text-xl font-bold">
          Official pages watched
        </h2>
        <p className="text-sm text-muted-foreground">
          A changed page is a flag, not an automatic edit. When wording changes on an official page, the page shows a review notice until a person
          has confirmed the figure.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {watch.map(([id, w]) => (
            <li key={id}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{w.label}</CardTitle>
                  <CardDescription className="break-all text-xs">{w.url}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {w.error ? `Could not read: ${w.error}` : w.changedSincePrevious ? "Changed since the last check. Review before updating any fee." : "No change since the previous check."}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="na" className="space-y-3">
        <h2 id="na" className="text-xl font-bold">
          Not auto-monitored yet
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
          {NOT_AUTO.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
