import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { CopyButton } from "@/components/codes/copy-button";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { getAllPostalAreaParams, getPostalPlace } from "@/lib/postal";
import { getPostalAreaExtras } from "@/lib/postal-area-extras";

export const dynamicParams = false;

function shortAreaTitle(rawName: string): string {
  return rawName.split("—")[0].replace(/\s*\(.*?\)\s*/g, "").trim();
}

export async function generateStaticParams() {
  return getAllPostalAreaParams().map(({ state, area }) => ({ state, area }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; area: string }>;
}): Promise<Metadata> {
  const { state, area } = await params;
  const hit = getPostalPlace(state, area);
  if (!hit) return { title: "Not found" };
  const { state: s, place: p } = hit;
  const areaLabel = shortAreaTitle(p.name);
  const stateLabel = s.slug === "fct-abuja" ? s.name : `${s.name} State`;
  const title = `${areaLabel} postal code — ${s.name} (${p.code})`;
  const description = `${areaLabel} in ${stateLabel} — verified 6-digit NIPOST postal / ZIP code ${p.code} (${p.label ?? `${s.capital} district`}). Neighbour comparisons, 1-tap copy, public sources and delivery notes, verified ${s.lastVerified}.`;
  return pageMetadata({
    path: `/codes/postal/${s.slug}/${p.slug}`,
    title,
    description,
    keywords: [
      `${areaLabel} postal code`,
      `${areaLabel} ZIP code`,
      `${s.name} ${areaLabel} postal code ${p.code}`,
      `${p.code} postal code Nigeria`,
    ],
  });
}

export default async function PostalAreaPage({
  params,
}: {
  params: Promise<{ state: string; area: string }>;
}) {
  const { state, area } = await params;
  const hit = getPostalPlace(state, area);
  if (!hit) notFound();
  const { state: s, place: p } = hit;
  const areaLabel = shortAreaTitle(p.name);
  const stateLabel = s.slug === "fct-abuja" ? s.name : `${s.name} State`;
  const path = `/codes/postal/${s.slug}/${p.slug}`;
  const extra = getPostalAreaExtras(s.slug, p.slug!);
  const leafSet = new Set(getAllPostalAreaParams().map((x) => `${x.state}:${x.area}`));
  const peers = s.places.filter((x) => x.slug !== p.slug && leafSet.has(`${s.slug}:${x.slug}`)).slice(0, 6);
  const nearbyStateRows = s.places.filter((x) => x.slug !== p.slug && !leafSet.has(`${s.slug}:${x.slug}`)).slice(0, 4);

  const uniqueSources = new Map<string, { label: string; url: string; tag?: string }>();
  for (const src of p.sources ?? []) {
    uniqueSources.set(src.url, { label: src.label, url: src.url, tag: `${areaLabel} (${p.code})` });
  }
  for (const src of s.sources) {
    if (!uniqueSources.has(src.url)) {
      uniqueSources.set(src.url, { label: src.label, url: src.url });
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Nigerian codes", href: "/codes" },
          { label: "Postal codes", href: "/codes/postal" },
          { label: s.name, href: `/codes/postal/${s.slug}` },
          { label: areaLabel, href: path },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {p.code} · {s.name} · {p.code.slice(0, 3)}xxx
          </Badge>
          <Badge variant="outline">Verified {s.lastVerified}</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {areaLabel} postal code — {s.name} ({p.code})
        </h1>
        <p className="text-muted-foreground">
          {extra?.intro ?? `${p.name} in ${stateLabel} uses verified NIPOST 6-digit code ${p.code}.`} The first three
          digits <code>{p.code.slice(0, 3)}</code> identify the dispatch sorting centre; the last three{" "}
          <code>{p.code.slice(3)}</code> identify the delivery post office or urban layout.
        </p>
        <ShareControls
          placement="inline"
          title={`${areaLabel} postal code — ${s.name} ${p.code}`}
          url={absUrl(path)}
          summary={`${areaLabel} (${s.name}) — verified NIPOST ${p.code} (${s.lastVerified})`}
        />
      </header>

      <section aria-labelledby="code" className="space-y-3">
        <h2 id="code" className="text-xl font-bold">Primary code — {areaLabel}</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{p.label ?? `${stateLabel} · ${s.range}`}</p>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3">
              <div>
                <p className="font-mono text-xl font-extrabold tabular-nums">{p.code}</p>
                <p className="text-xs text-muted-foreground">6-digit NIPOST delivery code for {areaLabel}</p>
              </div>
              <CopyButton text={p.code} />
            </div>
            {p.notes ? <p className="text-xs text-muted-foreground">{p.notes}</p> : null}
            {extra ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {extra.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Last verified {s.lastVerified} · manual · {stateLabel} · state head office {s.headOfficeCode} ({s.capital})
            </p>
          </CardContent>
        </Card>
      </section>

      {(peers.length > 0 || nearbyStateRows.length > 0) ? (
        <section aria-labelledby="neighbours" className="space-y-3 rounded-xl border bg-card/40 p-4">
          <h2 id="neighbours" className="text-base font-bold">Neighbouring codes in {stateLabel} — don’t mix</h2>
          {peers.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {peers.map((q) => (
                <li key={q.name + q.code}>
                  <Link
                    href={`/codes/postal/${s.slug}/${q.slug ?? ""}`}
                    className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm hover:border-primary"
                  >
                    <span className="font-semibold">{shortAreaTitle(q.name)}</span>
                    <span className="font-mono text-xs font-bold text-primary">{q.code} →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {nearbyStateRows.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
              {nearbyStateRows.map((nr) => (
                <span key={nr.slug ?? nr.name} className="rounded-full border bg-background px-2.5 py-1 font-mono">
                  {nr.code} <span className="font-sans text-muted-foreground">{shortAreaTitle(nr.name)}</span>
                </span>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            <Link
              href={`/codes/postal/${s.slug}`}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              See all {s.places.length} verified places in {stateLabel} →
            </Link>
          </p>
        </section>
      ) : null}

      {extra?.crossLinks.length ? (
        <section aria-labelledby="local-links" className="space-y-2 rounded-xl border bg-card/40 p-4">
          <h2 id="local-links" className="text-base font-bold">Matching LGA, airport &amp; port references</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {extra.crossLinks.map((cl) => (
              <li key={cl.href}>
                <Link
                  href={cl.href}
                  className="inline-flex min-h-9 items-center rounded-full border bg-background px-3 py-1 font-semibold hover:border-primary hover:text-primary"
                >
                  {cl.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="sources" className="space-y-2 rounded-xl border bg-card/40 p-4">
        <h2 id="sources" className="text-base font-bold">Sources &amp; how this code is verified</h2>
        <p className="text-xs text-muted-foreground">
          Every code cited on this page appears in at least one public compilation linked below — never guessed. Last
          manual check: {s.lastVerified}. When local street boundaries shift, your local NIPOST counter is authoritative.
        </p>
        <ul className="space-y-1.5 text-sm">
          {[...uniqueSources.values()].map((src) => (
            <li key={src.url}>
              {src.tag ? <span className="mr-1.5 text-xs font-semibold">{src.tag}:</span> : null}
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {src.label}
              </a>{" "}
              <span className="ml-1 break-all text-xs text-muted-foreground">{src.url}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="faq" className="text-lg font-bold">Frequently asked questions — {areaLabel}</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">
              Can I use {s.headOfficeCode} instead of {p.code} for {areaLabel}?
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {s.headOfficeCode} is the General Post Office code for {s.capital} (ending <code>001</code>). {areaLabel}{" "}
              has its own verified delivery code <strong>{p.code}</strong> — use {p.code} so parcels and address checks
              route to the right sorting office.
            </p>
          </div>
          {extra?.faqExtra ? (
            <div>
              <h3 className="text-sm font-semibold">{extra.faqExtra.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{extra.faqExtra.a}</p>
            </div>
          ) : null}
          <div>
            <h3 className="text-sm font-semibold">What about NIPOST’s 11-character NDAPS code?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter <strong>{p.code}</strong> unless a portal specifically asks for the 11-character National Digital
              Alphanumeric Postcode launched on 1 Oct 2026. Most bank KYC, customs and international checkout forms still
              require the 6-digit numeric postal code.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li>
            <Link href={`/codes/postal/${s.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">
              {stateLabel} — all {s.places.length} codes
            </Link>
          </li>
          <li>
            <Link href="/codes/postal" className="font-semibold text-primary underline-offset-2 hover:underline">
              All 36 states + FCT
            </Link>
          </li>
          <li>
            <Link href={`/geo/${s.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">
              {stateLabel} LGAs (/geo)
            </Link>
          </li>
          <li>
            <Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">
              Bank codes
            </Link>
          </li>
          <li>
            <Link href="/codes" className="text-muted-foreground underline-offset-2 hover:underline">
              Codes hub
            </Link>
          </li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema(path, areaLabel),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${areaLabel} postal code — ${s.name} ${p.code}`,
            description: `${p.name} — ${stateLabel} postal code ${p.code}, verified NIPOST 6-digit code (${s.lastVerified}).`,
            url: absUrl(path),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: s.lastVerified,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `Can I use ${s.headOfficeCode} instead of ${p.code} for ${areaLabel}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `No — ${s.headOfficeCode} is the GPO head office for ${s.capital}; ${areaLabel} uses ${p.code}.`,
                },
              },
              ...(extra?.faqExtra
                ? [
                    {
                      "@type": "Question",
                      name: extra.faqExtra.q,
                      acceptedAnswer: { "@type": "Answer", text: extra.faqExtra.a },
                    },
                  ]
                : []),
            ],
          },
        ]}
      />
    </div>
  );
}
