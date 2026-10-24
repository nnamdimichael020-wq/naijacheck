import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { getAirportBySlug, type Airport } from "@/lib/airports";
import {
  getAllOilGasOperatorSlugs,
  getAllOilGasOperators,
  getOilGasOperatorBySlug,
  operatorSegmentLabel,
  operatorTypeLabel,
  operatorTypeShortLabel,
  type OilGasOperator,
} from "@/lib/oil-gas";
import { getPortsForOilGasOperator, portCategoryShortLabel } from "@/lib/ports";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllOilGasOperatorSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const op = getOilGasOperatorBySlug(slug);
  if (!op) return { title: "Not found" };

  const shortType = operatorTypeShortLabel(op.type);
  const hqPart = op.headquartersCity ? ` · ${op.headquartersCity} HQ` : "";
  const title = `${op.name} (${shortType}) — Nigeria Operations, Assets${hqPart}`;
  const description = `${op.name}${op.fullLegalName && op.fullLegalName !== op.name ? ` (${op.fullLegalName})` : ""}: ${operatorTypeLabel(
    op.type,
  ).toLowerCase()} focused on ${(op.focusSummary ?? operatorSegmentLabel(op.segment)).toLowerCase()}${
    op.headquartersCity ? `, headquartered in ${op.headquartersCity}` : ""
  }. Verified Nigerian assets, regulator scope & primary sources (${op.lastVerified}).`;

  return pageMetadata({
    path: `/oil-gas/${op.slug}`,
    title,
    description,
    keywords: [
      op.name,
      ...(op.fullLegalName ? [op.fullLegalName] : []),
      ...(op.alternateNames ?? []),
      `${op.name} Nigeria`,
      `${op.name} headquarters`,
      "oil companies in Nigeria",
    ],
  });
}

function peerOperators(current: OilGasOperator, count = 6): OilGasOperator[] {
  const all = getAllOilGasOperators().filter((o) => o.slug !== current.slug);
  const sameType = all.filter((o) => o.type === current.type);
  const sameSegment = all.filter((o) => o.type !== current.type && o.segment === current.segment);
  const rest = all.filter((o) => o.type !== current.type && o.segment !== current.segment);
  return [...sameType, ...sameSegment, ...rest].slice(0, count);
}

function buildOperatorFaqs(op: OilGasOperator): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = [];

  faqs.push({
    q: `What does ${op.name} operate in Nigeria?`,
    a: op.operationsSummary,
  });

  if (op.headquartersCity) {
    const loc = op.headquartersLocality ? ` (${op.headquartersLocality})` : "";
    const st = op.stateName ? `, ${op.stateName}` : "";
    faqs.push({
      q: `Where is ${op.name} headquartered in Nigeria?`,
      a: `${op.name}'s Nigerian corporate headquarters is in ${op.headquartersCity}${loc}${st}.`,
    });
  }

  if (op.type) {
    faqs.push({
      q: `How is ${op.name} classified in Nigeria's petroleum sector?`,
      a: `In our verified reference (${op.lastVerified}), ${op.name} is classified as ${operatorTypeLabel(
        op.type,
      )} (${op.focusSummary ?? operatorSegmentLabel(op.segment)}).${op.listingStatus ? ` ${op.listingStatus}.` : ""}`,
    });
  }

  if (op.notes) {
    faqs.push({
      q: `What corporate or ownership context should I note for ${op.name}?`,
      a: op.notes,
    });
  }

  return faqs;
}

export default async function OilGasOperatorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const op = getOilGasOperatorBySlug(slug);
  if (!op) notFound();

  const path = `/oil-gas/${op.slug}`;
  const typeLabel = operatorTypeLabel(op.type);
  const segmentLabel = operatorSegmentLabel(op.segment);
  const related = peerOperators(op);
  const faqs = buildOperatorFaqs(op);

  const linkedAirports: Airport[] = (op.airportSlugs ?? [])
    .map((aSlug) => getAirportBySlug(aSlug))
    .filter((a): a is Airport => a !== null);

  const linkedPorts = getPortsForOilGasOperator(op.slug);

  const orgEntityLd: Record<string, unknown> = {
    "@type": "Organization",
    name: op.name,
    ...(op.fullLegalName ? { legalName: op.fullLegalName } : {}),
    ...(op.alternateNames && op.alternateNames.length > 0 ? { alternateName: op.alternateNames } : {}),
    ...(op.website ? { url: op.website, sameAs: [op.website] } : {}),
    description: op.operationsSummary,
    ...(op.headquartersCity
      ? {
          address: {
            "@type": "PostalAddress",
            ...(op.headquartersLocality ? { streetAddress: op.headquartersLocality } : {}),
            addressLocality: op.headquartersCity,
            ...(op.stateName ? { addressRegion: op.stateName } : {}),
            addressCountry: "NG",
          },
        }
      : {}),
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${op.name} — Nigeria Oil & Gas Operator Profile`,
    description: op.operationsSummary,
    url: absUrl(path),
    inLanguage: "en-NG",
    dateModified: op.lastVerified,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    mainEntity: orgEntityLd,
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Oil & Gas Operators", href: "/oil-gas" },
          { label: op.name, href: path },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {op.type ? (
            <Badge variant={op.type === "noc" || op.type === "ioc" ? "accent" : "outline"}>
              {typeLabel}
            </Badge>
          ) : null}
          {op.segment ? <Badge variant="outline">{segmentLabel}</Badge> : null}
          <span className="text-xs font-medium text-muted-foreground">
            Manually verified {op.lastVerified}
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{op.name}</h1>

        {op.fullLegalName && op.fullLegalName !== op.name ? (
          <p className="text-sm font-medium text-muted-foreground">
            Registered / operating entity: <strong className="text-foreground">{op.fullLegalName}</strong>
          </p>
        ) : null}

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {op.operationsSummary}
        </p>

        <ShareControls
          placement="inline"
          title={`${op.name} — Nigeria Oil & Gas Operator Reference`}
          url={absUrl(path)}
          summary={`${op.name} (${operatorTypeShortLabel(op.type)} · ${
            op.focusSummary ?? segmentLabel
          }) — verified Nigerian oil & gas profile and primary sources (${op.lastVerified})`}
        />
      </header>

      {/* Answer-first corporate snapshot */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick operator snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trading / common name
              </dt>
              <dd className="mt-1 font-semibold text-foreground">{op.name}</dd>
              {op.alternateNames && op.alternateNames.length > 0 ? (
                <dd className="mt-1 text-xs text-muted-foreground">
                  Also searched as: {op.alternateNames.join(", ")}
                </dd>
              ) : null}
            </div>

            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Operator category &amp; segment
              </dt>
              <dd className="mt-1 font-semibold text-foreground">{typeLabel}</dd>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {op.focusSummary ?? segmentLabel}
              </dd>
            </div>

            {op.headquartersCity ? (
              <div className="rounded-lg border bg-card/50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Nigerian headquarters
                </dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {op.headquartersCity}
                  {op.stateName ? `, ${op.stateName}` : ""}
                </dd>
                {op.headquartersLocality ? (
                  <dd className="mt-0.5 text-xs text-muted-foreground">{op.headquartersLocality}</dd>
                ) : null}
                <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {op.stateSlug ? (
                    <Link href={`/geo/${op.stateSlug}`} className="font-medium text-primary hover:underline">
                      {op.stateName ?? op.stateSlug} LGAs →
                    </Link>
                  ) : null}
                  {op.stateSlug && op.lgaSlug ? (
                    <Link
                      href={`/geo/${op.stateSlug}/${op.lgaSlug}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {op.lgaName ?? op.lgaSlug} LGA →
                    </Link>
                  ) : null}
                  {op.postalHref && op.postalLabel ? (
                    <Link href={op.postalHref} className="font-medium text-primary hover:underline">
                      Postal: {op.postalLabel} →
                    </Link>
                  ) : null}
                </dd>
              </div>
            ) : null}

            {op.regulatorScope ? (
              <div className="rounded-lg border bg-card/50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Statutory regulator scope (PIA)
                </dt>
                <dd className="mt-1 font-medium text-foreground">{op.regulatorScope}</dd>
                <dd className="mt-0.5 text-xs text-muted-foreground">
                  Verified from public NUPRC / NMDPRA mandates
                </dd>
              </div>
            ) : null}

            {op.listingStatus ? (
              <div className="rounded-lg border bg-card/50 p-3 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Corporate ownership / exchange status
                </dt>
                <dd className="mt-1 text-foreground">{op.listingStatus}</dd>
                <dd className="mt-1 text-[11px] text-muted-foreground">
                  Factual corporate registry note only — NaijaCheck does not provide share prices or investment advice.
                </dd>
              </div>
            ) : null}

            {op.website ? (
              <div className="rounded-lg border bg-card/50 p-3 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Official corporate website
                </dt>
                <dd className="mt-1">
                  <a
                    href={op.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {op.website}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {/* Key Nigerian assets & divestment disambiguation */}
      {(op.keyAssets && op.keyAssets.length > 0) || op.notes ? (
        <section aria-labelledby="assets-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
          <h2 id="assets-h" className="text-lg font-bold">
            Key Nigerian operations, subsidiaries &amp; assets
          </h2>

          {op.keyAssets && op.keyAssets.length > 0 ? (
            <ul className="space-y-2 text-sm text-foreground">
              {op.keyAssets.map((asset) => (
                <li key={asset} className="flex items-start gap-2 leading-relaxed">
                  <span className="mt-1 text-primary">•</span>
                  <span>{asset}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {op.notes ? (
            <div className="rounded-lg border bg-background p-3.5 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Disambiguation &amp; transition note:</strong> {op.notes}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Operational corridors, maritime terminals & commercial aviation links */}
      {(op.operationalHubs && op.operationalHubs.length > 0) ||
      linkedAirports.length > 0 ||
      linkedPorts.length > 0 ? (
        <section aria-labelledby="corridors-h" className="space-y-4 rounded-xl border bg-card/40 p-5">
          <h2 id="corridors-h" className="text-lg font-bold">
            Operational corridors, maritime terminals &amp; aviation gateways
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {op.operationalHubs && op.operationalHubs.length > 0 ? (
              <div className="rounded-lg border bg-background p-3.5 text-xs">
                <p className="font-bold text-foreground">Nigerian operational hubs</p>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  {op.operationalHubs.map((hub) => (
                    <li key={hub}>• {hub}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {linkedAirports.length > 0 ? (
              <div className="rounded-lg border bg-background p-3.5 text-xs">
                <p className="font-bold text-foreground">Serving commercial airports on NaijaCheck</p>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  {linkedAirports.map((airport) => {
                    const codePair = [airport.iata, airport.icao].filter(Boolean).join(" / ");
                    return (
                      <li key={airport.slug}>
                        <Link
                          href={`/airports/${airport.slug}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {airport.name} ({codePair})
                        </Link>{" "}
                        — {airport.city}, {airport.stateName}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {linkedPorts.length > 0 ? (
              <div className="rounded-lg border bg-background p-3.5 text-xs sm:col-span-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold text-foreground">
                    Linked Nigerian seaports &amp; marine export terminals (/ports)
                  </p>
                  <Link href="/ports" className="font-semibold text-primary hover:underline">
                    All 12 Nigerian ports →
                  </Link>
                </div>
                <ul className="mt-2 grid gap-1.5 text-muted-foreground sm:grid-cols-2">
                  {linkedPorts.map((port) => (
                    <li key={port.slug}>
                      •{" "}
                      <Link href={`/ports/${port.slug}`} className="font-medium text-primary hover:underline">
                        {port.name}
                        {port.unLocode ? ` (${port.unLocode})` : ""}
                      </Link>{" "}
                      — {portCategoryShortLabel(port.category)} ({port.stateName})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Truthful FAQs */}
      {faqs.length > 0 ? (
        <section aria-labelledby="faqs-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
          <h2 id="faqs-h" className="text-lg font-bold">
            Frequently asked questions about {op.name}
          </h2>
          <div className="divide-y rounded-lg border bg-background">
            {faqs.map((f) => (
              <details key={f.q} className="group p-4 text-sm">
                <summary className="cursor-pointer list-none font-semibold text-foreground group-open:text-primary">
                  {f.q}
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {/* Primary sources & verification */}
      <section id="sources" aria-labelledby="sources-h" className="space-y-3 rounded-xl border bg-card/40 p-5 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sources-h" className="text-base font-bold text-foreground">
            Cited corporate &amp; regulatory sources
          </h2>
          <span className="text-muted-foreground">
            Verification: {op.verification} · lastVerified {op.lastVerified}
          </span>
        </div>

        <ul className="space-y-1.5 text-muted-foreground">
          {op.sources.map((src) => (
            <li key={src.url} className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-medium text-foreground">•</span>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {src.label}
              </a>
              <span className="text-[11px] text-muted-foreground">({new URL(src.url).hostname})</span>
            </li>
          ))}
        </ul>

        <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
          <strong>Editorial scope:</strong> NaijaCheck is an independent static utility and is not affiliated with{" "}
          {op.name}, NNPC Limited, NUPRC, or NMDPRA. We never publish recruitment portals, contract tenders, crude price
          predictions, or stock recommendations; verify career and procurement notices directly on the operator’s
          official domain above.
        </p>
      </section>

      {/* Related peer operators & cross-vertical utility links */}
      <section aria-labelledby="peers-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="peers-h" className="text-base font-bold">
            Compare other verified oil &amp; gas operators in Nigeria
          </h2>
          <Link href="/oil-gas" className="text-xs font-semibold text-primary hover:underline">
            All 16 operators →
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {related.map((peer) => (
            <Link
              key={peer.slug}
              href={`/oil-gas/${peer.slug}`}
              className="rounded-lg border bg-background p-3 text-xs transition-colors hover:border-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-foreground">{peer.name}</span>
                <Badge variant="outline">{operatorTypeShortLabel(peer.type)}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">
                {peer.focusSummary ?? operatorSegmentLabel(peer.segment)}
                {peer.headquartersCity ? ` · ${peer.headquartersCity}` : ""}
              </p>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium">
          <Link href="/prices/fuel" className="text-primary hover:underline">
            Stored depot fuel prices (/prices/fuel) →
          </Link>
          <Link href="/rates" className="text-primary hover:underline">
            USD/NGN official &amp; parallel rates (/rates) →
          </Link>
          <Link href="/airports" className="text-primary hover:underline">
            Nigerian airports directory (/airports) →
          </Link>
          <Link href="/ports" className="text-primary hover:underline">
            Nigerian seaports directory (/ports) →
          </Link>
        </div>
      </section>

      <JsonLd data={[webPageSchema, breadcrumbSchema(path, op.name), faqSchema]} />
    </div>
  );
}
