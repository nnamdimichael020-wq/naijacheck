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
import { airportTypeLabel, getAirportBySlug, type Airport } from "@/lib/airports";
import {
  airlineCodeSummary,
  airlineStatusLabel,
  airlineStatusShortLabel,
  getAirlineBySlug,
  getAllAirlineSlugs,
  getAllAirlines,
  isHistoricalAirlineStatus,
  type Airline,
} from "@/lib/airlines";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllAirlineSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const airline = getAirlineBySlug(slug);
  if (!airline) return { title: "Not found" };

  const codes = airlineCodeSummary(airline);
  const shortStatus = airlineStatusShortLabel(airline.status);
  const title = `${airline.name} (${codes}) — ${shortStatus} Nigerian Airline Profile`;
  const description = `${airline.name}${
    airline.fullLegalName && airline.fullLegalName !== airline.name ? ` (${airline.fullLegalName})` : ""
  }: ${airlineStatusLabel(airline.status).toLowerCase()}${airline.iata ? `, IATA ${airline.iata}` : ""}${
    airline.icao ? `, ICAO ${airline.icao}` : ""
  }${airline.yearsActive ? `, active ${airline.yearsActive}` : ""} — Nigerian hub airports & cited sources (${
    airline.lastVerified
  }).`;

  return pageMetadata({
    path: `/airlines/${airline.slug}`,
    title,
    description,
    keywords: [
      airline.name,
      ...(airline.formerNames ?? []),
      `${airline.name} Nigeria`,
      `${airline.name} IATA code`,
      `${airline.name} status`,
      ...(airline.iata ? [`${airline.iata} airline`, `${airline.iata} airline Nigeria`] : []),
      ...(airline.icao ? [`${airline.icao} airline`] : []),
    ],
  });
}

function peerAirlines(current: Airline, count = 6): Airline[] {
  const all = getAllAirlines().filter((a) => a.slug !== current.slug);
  const sameStatus = all.filter((a) => a.status === current.status);
  const sharedHub = all.filter(
    (a) =>
      a.status !== current.status &&
      a.hubAirportSlugs.some((slug) => current.hubAirportSlugs.includes(slug)),
  );
  const rest = all.filter(
    (a) => !sameStatus.some((s) => s.slug === a.slug) && !sharedHub.some((s) => s.slug === a.slug),
  );
  return [...sameStatus, ...sharedHub, ...rest].slice(0, count);
}

function buildAirlineFaqs(airline: Airline, hubAirports: Airport[]): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = [];
  const isHist = isHistoricalAirlineStatus(airline.status);

  faqs.push({
    q: `Is ${airline.name} currently operating in Nigeria?`,
    a: `${airlineStatusLabel(airline.status)} (manually verified ${airline.lastVerified}). ${airline.statusContext}`,
  });

  if (airline.iata && airline.icao) {
    faqs.push({
      q: `What are the IATA and ICAO airline codes for ${airline.name}?`,
      a: `${airline.name} ${isHist ? "operated under historical" : "uses"} 2-character IATA designator ${airline.iata} and 3-letter ICAO designator ${airline.icao}${
        airline.callsign ? ` (radiotelephony callsign: ${airline.callsign})` : ""
      }.${airline.iataHistoricalNote ? ` ${airline.iataHistoricalNote}` : ""}`,
    });
  } else if (airline.icao) {
    faqs.push({
      q: `What is the airline code for ${airline.name}?`,
      a: `${airline.name} ${isHist ? "carried" : "carries"} the 3-letter ICAO designator ${airline.icao}${
        airline.callsign ? ` (callsign: ${airline.callsign})` : ""
      }. An active 2-character IATA designator is omitted in our directory because verified registries record none currently assigned.`,
    });
  }

  if (hubAirports.length > 0) {
    const hubNames = hubAirports
      .map((ap) => `${ap.name} in ${ap.city} (${ap.iata ?? ap.icao})`)
      .join(", ");
    faqs.push({
      q: `Which Nigerian airports ${isHist ? "served" : "serve"} as ${airline.name}'s main hubs?`,
      a: `${airline.name}'s primary Nigerian operational ${hubAirports.length > 1 ? "bases are" : "base is"} ${hubNames}${
        airline.headquartersCity ? `, with corporate headquarters in ${airline.headquartersCity}, ${airline.stateName}` : ""
      }.`,
    });
  }

  if (airline.formerNames && airline.formerNames.length > 0) {
    faqs.push({
      q: `What other or former names are associated with ${airline.name}?`,
      a: `In regulatory filings or earlier operating periods, ${airline.name} has also been recorded as ${airline.formerNames.join(", ")}.`,
    });
  }

  return faqs;
}

export default async function AirlineDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const airline = getAirlineBySlug(slug);
  if (!airline) notFound();

  const path = `/airlines/${airline.slug}`;
  const codes = airlineCodeSummary(airline);
  const statusLabel = airlineStatusLabel(airline.status);
  const shortStatus = airlineStatusShortLabel(airline.status);
  const isHist = isHistoricalAirlineStatus(airline.status);

  const hubAirports = airline.hubAirportSlugs
    .map((hubSlug) => getAirportBySlug(hubSlug))
    .filter((a): a is Airport => a !== null);

  const related = peerAirlines(airline);
  const faqs = buildAirlineFaqs(airline, hubAirports);

  const airlineEntityLd: Record<string, unknown> = {
    "@type": "Airline",
    name: airline.name,
    ...(airline.fullLegalName && airline.fullLegalName !== airline.name ? { legalName: airline.fullLegalName } : {}),
    ...(airline.formerNames && airline.formerNames.length > 0 ? { alternateName: airline.formerNames } : {}),
    ...(airline.iata ? { iataCode: airline.iata } : {}),
    ...(airline.website && airline.status === "operating" ? { url: airline.website } : {}),
    ...(airline.foundedYear ? { foundingDate: String(airline.foundedYear) } : {}),
    ...(airline.ceasedYear ? { dissolutionDate: String(airline.ceasedYear) } : {}),
    address: {
      "@type": "PostalAddress",
      ...(airline.headquartersCity ? { addressLocality: airline.headquartersCity } : {}),
      addressRegion: airline.stateName,
      addressCountry: "NG",
    },
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Airlines in Nigeria", href: "/airlines" },
          { label: `${airline.name} (${codes})`, href: path },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              airline.status === "operating"
                ? "accent"
                : airline.status === "suspended"
                  ? "muted"
                  : "outline"
            }
          >
            {shortStatus}
          </Badge>
          <Badge variant="outline">{codes}</Badge>
          {airline.yearsActive ? <Badge variant="outline">{airline.yearsActive}</Badge> : null}
          <span className="text-xs font-medium text-muted-foreground">Manually verified {airline.lastVerified}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {airline.name} ({codes})
          <span className="block pt-1 text-base font-medium tracking-normal text-muted-foreground">
            {statusLabel}
            {airline.headquartersCity ? ` · ${airline.headquartersCity}` : ` · ${airline.stateName}`}
          </span>
        </h1>

        {airline.formerNames && airline.formerNames.length > 0 ? (
          <p className="text-xs text-muted-foreground sm:text-sm">
            <strong>Former / alternate identifiers:</strong> {airline.formerNames.join(" · ")}
          </p>
        ) : null}

        <ShareControls
          placement="inline"
          title={`${airline.name} (${codes}) — ${shortStatus} Nigerian Airline Profile`}
          url={absUrl(path)}
          summary={`${airline.name} (${codes}) — ${shortStatus.toLowerCase()} Nigerian airline profile, hub airports & cited NCAA/IATA sources (verified ${airline.lastVerified})`}
        />
      </header>

      <section aria-labelledby="key-facts" className="space-y-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle id="key-facts" className="text-lg">
              Answer-first airline summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Operating status (verified {airline.lastVerified})
                </dt>
                <dd className="mt-1 font-bold text-foreground">{statusLabel}</dd>
                {airline.yearsActive ? (
                  <dd className="mt-0.5 font-mono text-xs text-muted-foreground">Years active: {airline.yearsActive}</dd>
                ) : null}
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Corporate / legal name
                </dt>
                <dd className="mt-1 font-medium text-foreground">{airline.fullLegalName ?? airline.name}</dd>
                {airline.website && airline.status === "operating" ? (
                  <dd className="mt-1 text-xs">
                    <a
                      href={airline.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Official airline website ↗
                    </a>
                  </dd>
                ) : null}
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  IATA 2-character designator{isHist && airline.iata ? " (historical)" : ""}
                </dt>
                <dd className="mt-1">
                  {airline.iata ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-extrabold tabular-nums">{airline.iata}</span>
                        <CopyButton text={airline.iata} />
                      </div>
                      {airline.iataHistoricalNote ? (
                        <p className="text-xs text-muted-foreground">{airline.iataHistoricalNote}</p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Unassigned / omitted (no confirmed active IATA code)
                    </span>
                  )}
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  ICAO 3-letter designator &amp; callsign
                </dt>
                <dd className="mt-1">
                  {airline.icao ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-extrabold tabular-nums">{airline.icao}</span>
                        <CopyButton text={airline.icao} />
                      </div>
                      {airline.callsign ? (
                        <p className="font-mono text-xs text-muted-foreground">Callsign: {airline.callsign}</p>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Headquarters, state &amp; postal reference
                </dt>
                <dd className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-foreground">
                  <span className="font-medium">
                    {airline.headquartersCity ? `${airline.headquartersCity}, ` : ""}
                    {airline.stateName}
                  </span>
                  <Link
                    href={`/geo/${airline.stateSlug}`}
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {airline.stateName} LGAs →
                  </Link>
                  {airline.lgaSlug && airline.lgaName ? (
                    <Link
                      href={`/geo/${airline.stateSlug}/${airline.lgaSlug}`}
                      className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {airline.lgaName} LGA →
                    </Link>
                  ) : null}
                  {airline.postalHref ? (
                    <Link
                      href={airline.postalHref}
                      className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {airline.postalLabel ?? `${airline.stateName} postal codes`} →
                    </Link>
                  ) : null}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>

      {hubAirports.length > 0 ? (
        <section aria-labelledby="hubs-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="hubs-h" className="text-lg font-bold">
              {isHist ? "Historical Nigerian hub & base airports" : "Primary Nigerian hub & focus airports"}
            </h2>
            <Link href="/airports" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
              All 24 Nigerian airports →
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {hubAirports.map((ap) => (
              <Link
                key={ap.slug}
                href={`/airports/${ap.slug}`}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/60"
              >
                <div>
                  <p className="font-bold text-foreground">{ap.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ap.city}, {ap.stateName} · {airportTypeLabel(ap.type)}
                  </p>
                </div>
                <span className="shrink-0 rounded border bg-secondary/40 px-2 py-0.5 font-mono text-xs font-bold">
                  {ap.iata ? `${ap.iata} / ${ap.icao}` : ap.icao}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="ops-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="ops-h" className="text-lg font-bold">
          Regulatory status, route history &amp; operational profile
        </h2>
        <p className="leading-relaxed text-foreground">{airline.serviceScope}</p>
        <p className="leading-relaxed text-foreground">{airline.statusContext}</p>
        {airline.notes ? <p className="leading-relaxed text-muted-foreground">{airline.notes}</p> : null}
        <p className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
          <strong>Static reference notice:</strong> NaijaCheck documents verified airline operating status, IATA and
          ICAO designators, hub airports, and regulatory citations. We do not sell flight tickets, quote airfares, or
          publish departure boards — confirm directly with an active NCAA-licensed airline before travelling.
        </p>
      </section>

      <section aria-labelledby="faq-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="faq-h" className="text-lg font-bold">
          Frequently asked questions — {airline.name}
        </h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-lg border bg-background p-3.5">
              <h3 className="font-bold text-foreground">{f.q}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="sources" aria-labelledby="sources-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sources-h" className="text-lg font-bold">
            Cited sources &amp; verification ({airline.lastVerified})
          </h2>
          <Badge variant="outline">Manual check · {airline.sources.length} cited references</Badge>
        </div>
        <ul className="space-y-2">
          {airline.sources.map((src) => (
            <li key={src.url} className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <Badge variant={src.kind === "primary" ? "accent" : "outline"} className="text-[10px] uppercase">
                {src.kind === "primary" ? "Primary" : "Secondary"}
              </Badge>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {src.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="related-h" className="space-y-4 rounded-xl border bg-card/40 p-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="related-h" className="text-base font-bold">
            Other Nigerian airlines ({shortStatus.toLowerCase()} &amp; related hubs)
          </h2>
          <Link href="/airlines" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
            All 23 Nigerian airlines →
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {related.map((peer) => (
            <Link
              key={peer.slug}
              href={`/airlines/${peer.slug}`}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/60"
            >
              <div>
                <p className="font-bold text-foreground">{peer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {airlineStatusShortLabel(peer.status)}
                  {peer.yearsActive ? ` · ${peer.yearsActive}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded border bg-secondary/40 px-2 py-0.5 font-mono text-xs font-bold">
                {airlineCodeSummary(peer)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema(path, airline.name),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${airline.name} (${codes}) — ${shortStatus} Nigerian Airline Profile`,
            description: `${airline.name}: verified Nigerian airline status, IATA and ICAO designators, hub airports, and regulatory sources.`,
            url: absUrl(path),
            inLanguage: "en-NG",
            dateModified: airline.lastVerified,
            isPartOf: {
              "@type": "WebSite",
              name: SITE_CONFIG.name,
              url: SITE_CONFIG.url,
            },
            mainEntity: airlineEntityLd,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: f.a,
              },
            })),
          },
        ]}
      />
    </div>
  );
}
