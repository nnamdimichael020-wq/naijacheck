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
import {
  airportTypeLabel,
  getAirportBySlug,
  getAirportsByState,
  getAllAirportSlugs,
  getAllAirports,
  type Airport,
} from "@/lib/airports";
import {
  airlineCodeSummary,
  airlineStatusShortLabel,
  getAirlinesByHubAirportSlug,
} from "@/lib/airlines";
import { getPortsForAirport, portCategoryShortLabel } from "@/lib/ports";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllAirportSlugs().map((slug) => ({ slug }));
}

function codeSummaryLabel(airport: Airport): string {
  if (airport.iata && airport.icao) return `${airport.iata} / ${airport.icao}`;
  if (airport.iata) return `IATA ${airport.iata}`;
  if (airport.icao) return `ICAO ${airport.icao}`;
  return "Nigeria airport";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const airport = getAirportBySlug(slug);
  if (!airport) return { title: "Not found" };

  const codes = codeSummaryLabel(airport);
  const typeLabel = airportTypeLabel(airport.type).toLowerCase();
  const title = `${airport.name} (${codes}) — ${airport.city}, ${airport.stateName}`;
  const description = `${airport.name} in ${airport.city}, ${airport.stateName} (${typeLabel} commercial airport): ${
    airport.iata ? `IATA code ${airport.iata}, ` : "unassigned global IATA code, "
  }${airport.icao ? `ICAO ${airport.icao}` : ""}${
    airport.operator ? `, operated by ${airport.operator.split(";")[0].split("(")[0].trim()}` : ""
  } — runway, LGA & cited sources (${airport.lastVerified}).`;

  return pageMetadata({
    path: `/airports/${airport.slug}`,
    title,
    description,
    keywords: [
      airport.name,
      ...(airport.alternateNames ?? []),
      `${airport.city} airport`,
      `${airport.city} airport code`,
      ...(airport.iata ? [`${airport.iata} airport`, `${airport.iata} airport Nigeria`] : []),
      ...(airport.icao ? [`${airport.icao} airport`] : []),
      `${airport.stateName} airport`,
    ],
  });
}

function peerAirports(current: Airport, count = 6): Airport[] {
  const all = getAllAirports().filter((a) => a.slug !== current.slug);
  const sameState = all.filter((a) => a.stateSlug === current.stateSlug);
  const sameType = all.filter((a) => a.stateSlug !== current.stateSlug && a.type === current.type);
  const otherType = all.filter((a) => a.stateSlug !== current.stateSlug && a.type !== current.type);
  return [...sameState, ...sameType, ...otherType].slice(0, count);
}

function buildAirportFaqs(airport: Airport): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = [];

  if (airport.iata && airport.icao) {
    faqs.push({
      q: `What are the IATA and ICAO codes for ${airport.name}?`,
      a: `The 3-letter IATA airport code for ${airport.name} (${airport.city}) is ${airport.iata}, and its 4-letter Nigerian ICAO location indicator is ${airport.icao}.`,
    });
  } else if (airport.icao) {
    faqs.push({
      q: `What is the airport code for ${airport.name}?`,
      a: `${airport.name} (${airport.city}) carries the 4-letter ICAO location indicator ${airport.icao}. An official global 3-letter IATA code is omitted in our reference because international aeronautical registries record none assigned to this aerodrome${
        airport.notes ? ` (${airport.notes})` : "."
      }`,
    });
  }

  const lgaPart = airport.lgaName ? ` in ${airport.lgaName} Local Government Area` : "";
  const localityPart = airport.locality ? ` (${airport.locality})` : "";
  faqs.push({
    q: `Where is ${airport.name} located in Nigeria?`,
    a: `${airport.name} serves ${airport.city}${localityPart}${lgaPart}, ${airport.stateName}, Nigeria.${
      airport.operator ? ` Operations are managed by ${airport.operator}.` : ""
    }`,
  });

  faqs.push({
    q: `Is ${airport.name} an international or domestic airport?`,
    a:
      airport.type === "international"
        ? `${airport.name} is classified as one of Nigeria's federally designated scheduled international passenger gateways, handling cross-border passenger operations alongside domestic commercial routes (verified ${airport.lastVerified}).`
        : `${airport.name} is classified in our directory as a domestic commercial airport based on its regular scheduled passenger operations (verified ${airport.lastVerified}).${
            airport.notes ? ` ${airport.notes}` : ""
          }`,
  });

  if (airport.alternateNames && airport.alternateNames.length > 0) {
    faqs.push({
      q: `What other names are used for ${airport.name}?`,
      a: `In federal aviation notices, airline timetables, or local usage, ${airport.name} is also referred to as ${airport.alternateNames.join(", ")}.`,
    });
  }

  return faqs;
}

export default async function AirportDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const airport = getAirportBySlug(slug);
  if (!airport) notFound();

  const path = `/airports/${airport.slug}`;
  const codes = codeSummaryLabel(airport);
  const typeLabel = airportTypeLabel(airport.type);
  const stateSiblings = getAirportsByState(airport.stateSlug).filter((a) => a.slug !== airport.slug);
  const hubAirlines = getAirlinesByHubAirportSlug(airport.slug);
  const corridorPorts = getPortsForAirport(airport.slug);
  const related = peerAirports(airport);
  const faqs = buildAirportFaqs(airport);

  const airportEntityLd: Record<string, unknown> = {
    "@type": "Airport",
    name: airport.name,
    ...(airport.alternateNames && airport.alternateNames.length > 0 ? { alternateName: airport.alternateNames } : {}),
    ...(airport.iata ? { iataCode: airport.iata } : {}),
    ...(airport.icao ? { icaoCode: airport.icao } : {}),
    address: {
      "@type": "PostalAddress",
      ...(airport.locality ? { streetAddress: airport.locality } : {}),
      addressLocality: airport.city,
      addressRegion: airport.stateName,
      addressCountry: "NG",
    },
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Airports in Nigeria", href: "/airports" },
          { label: `${airport.city} (${airport.iata ?? airport.icao ?? airport.slug})`, href: path },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{codes}</Badge>
          <Badge variant="outline">{typeLabel} commercial airport</Badge>
          <span className="text-xs font-medium text-muted-foreground">Manually verified {airport.lastVerified}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {airport.name} ({codes})
          <span className="block pt-1 text-base font-medium tracking-normal text-muted-foreground">
            {airport.city} · {airport.stateName}
            {airport.alternateNames && airport.alternateNames.length > 0
              ? ` · Also known as ${airport.alternateNames.join(" / ")}`
              : ""}
          </span>
        </h1>

        <ShareControls
          placement="inline"
          title={`${airport.name} (${codes}) — ${airport.city}, ${airport.stateName}`}
          url={absUrl(path)}
          summary={`${airport.name} (${codes}) in ${airport.city}, ${airport.stateName} — ${typeLabel.toLowerCase()} airport profile, LGA & cited sources (verified ${airport.lastVerified})`}
        />
      </header>

      <section aria-labelledby="key-facts" className="space-y-3">
        <Card className="border-primary/25">
          <CardHeader className="pb-3">
            <CardTitle id="key-facts" className="text-base font-bold">
              Key reference facts — {airport.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  3-letter IATA code
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-2">
                  {airport.iata ? (
                    <>
                      <div>
                        <span className="font-mono text-2xl font-extrabold tabular-nums">{airport.iata}</span>
                        <p className="text-xs text-muted-foreground">Passenger ticketing &amp; baggage tag code</p>
                      </div>
                      <CopyButton text={airport.iata} />
                    </>
                  ) : (
                    <div>
                      <span className="font-semibold text-muted-foreground">Unassigned in global IATA registry</span>
                      <p className="text-xs text-muted-foreground">Omitted rather than guessed — see note below</p>
                    </div>
                  )}
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  4-letter ICAO indicator
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-2">
                  {airport.icao ? (
                    <>
                      <div>
                        <span className="font-mono text-2xl font-extrabold tabular-nums">{airport.icao}</span>
                        <p className="text-xs text-muted-foreground">Air traffic control &amp; NOTAM identifier</p>
                      </div>
                      <CopyButton text={airport.icao} />
                    </>
                  ) : (
                    <span className="text-muted-foreground">Unverified</span>
                  )}
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  City, LGA &amp; State
                </dt>
                <dd className="mt-1 space-y-1">
                  <p className="font-semibold text-foreground">
                    {airport.city}
                    {airport.locality ? ` — ${airport.locality}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <Link
                      href={`/geo/${airport.stateSlug}`}
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {airport.stateName} LGAs →
                    </Link>
                    {airport.lgaSlug && airport.lgaName ? (
                      <Link
                        href={`/geo/${airport.stateSlug}/${airport.lgaSlug}`}
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {airport.lgaName} LGA →
                      </Link>
                    ) : null}
                    {airport.postalHref ? (
                      <Link
                        href={airport.postalHref}
                        className="font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        {airport.postalLabel ?? `${airport.stateName} postal codes`} →
                      </Link>
                    ) : null}
                  </div>
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scheduled passenger designation
                </dt>
                <dd className="mt-1 space-y-1">
                  <p className="font-semibold text-foreground">
                    {airport.type === "international"
                      ? "International gateway (scheduled cross-border + domestic)"
                      : "Domestic commercial airport"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Verified {airport.lastVerified} from FAAN / NCAA / official aviation records
                  </p>
                </dd>
              </div>

              {airport.operator ? (
                <div className="rounded-lg border bg-card/40 p-3 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Operator &amp; management
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">{airport.operator}</dd>
                </div>
              ) : null}

              {airport.runwayNote ? (
                <div className="rounded-lg border bg-card/40 p-3 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Runway &amp; terminal infrastructure
                  </dt>
                  <dd className="mt-1 text-foreground">{airport.runwayNote}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="ops-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="ops-h" className="text-lg font-bold">
          Operations, history &amp; naming context
        </h2>
        {airport.operationsNote ? <p className="leading-relaxed text-foreground">{airport.operationsNote}</p> : null}
        {airport.notes ? <p className="leading-relaxed text-muted-foreground">{airport.notes}</p> : null}
        <p className="rounded-lg border bg-background p-3 text-xs text-muted-foreground">
          <strong>Static reference notice:</strong> NaijaCheck records verified airport codes, geographic jurisdiction,
          and operator context. We do not publish flight departure boards, ticket fares, or airline booking links —
          check directly with your operating airline or FAAN before travelling.
        </p>
      </section>

      {hubAirlines.length > 0 ? (
        <section aria-labelledby="hub-airlines-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="hub-airlines-h" className="text-lg font-bold">
              Nigerian airlines with verified hub or historical base at {airport.city}
            </h2>
            <Link href="/airlines" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
              All 23 Nigerian airlines →
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {hubAirlines.map((airline) => (
              <Link
                key={airline.slug}
                href={`/airlines/${airline.slug}`}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/60"
              >
                <div>
                  <p className="font-bold text-foreground">{airline.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {airlineStatusShortLabel(airline.status)}
                    {airline.yearsActive ? ` · ${airline.yearsActive}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded border bg-secondary/40 px-2 py-0.5 font-mono text-xs font-bold">
                  {airlineCodeSummary(airline)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {corridorPorts.length > 0 ? (
        <section aria-labelledby="corridor-ports-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="corridor-ports-h" className="text-lg font-bold">
              Seaports &amp; marine terminals in the {airport.city} corridor
            </h2>
            <Link href="/ports" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
              All 12 Nigerian ports →
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {corridorPorts.map((port) => (
              <Link
                key={port.slug}
                href={`/ports/${port.slug}`}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/60"
              >
                <div>
                  <p className="font-bold text-foreground">{port.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {port.city ? `${port.city}, ` : ""}
                    {port.stateName} · {portCategoryShortLabel(port.category)}
                  </p>
                </div>
                {port.unLocode ? (
                  <span className="shrink-0 rounded border bg-secondary/40 px-2 py-0.5 font-mono text-xs font-bold">
                    {port.unLocode}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="faq-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="faq-h" className="text-lg font-bold">
          Frequently asked questions — {airport.name}
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
            Cited sources &amp; verification ({airport.lastVerified})
          </h2>
          <Badge variant="outline">Manual check · {airport.sources.length} cited references</Badge>
        </div>
        <ul className="space-y-2">
          {airport.sources.map((src) => (
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
            {stateSiblings.length > 0
              ? `Other airports in ${airport.stateName} & across Nigeria`
              : `Other verified Nigerian airports`}
          </h2>
          <Link href="/airports" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
            All 24 Nigerian airports →
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {related.map((peer) => (
            <Link
              key={peer.slug}
              href={`/airports/${peer.slug}`}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/60"
            >
              <div>
                <p className="font-bold text-foreground">{peer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {peer.city}, {peer.stateName} · {airportTypeLabel(peer.type)}
                </p>
              </div>
              <span className="shrink-0 rounded border bg-secondary/40 px-2 py-0.5 font-mono text-xs font-bold">
                {peer.iata ?? peer.icao}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema(path, airport.name),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${airport.name} (${codes}) — ${airport.city}, ${airport.stateName}`,
            description: `${airport.name} in ${airport.city}, ${airport.stateName}: IATA/ICAO codes, scheduled passenger designation, operator, runway details, and verified sources.`,
            url: absUrl(path),
            inLanguage: "en-NG",
            dateModified: airport.lastVerified,
            isPartOf: {
              "@type": "WebSite",
              name: SITE_CONFIG.name,
              url: SITE_CONFIG.url,
            },
            mainEntity: airportEntityLd,
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
