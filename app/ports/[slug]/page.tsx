import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { CopyButton } from "@/components/codes/copy-button";
import { SITE_CONFIG } from "@/config/site";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { getAirportBySlug } from "@/lib/airports";
import { getOilGasOperatorBySlug, operatorTypeShortLabel } from "@/lib/oil-gas";
import {
  formatUnLocodeSpaced,
  getAllPorts,
  getPortBySlug,
  getRelatedPorts,
  portCategoryLabel,
  portCategoryShortLabel,
  type NigerianPort,
} from "@/lib/ports";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPorts().map((port) => ({ slug: port.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const port = getPortBySlug(slug);
  if (!port) return {};

  const codeTag = port.unLocode ? ` (${port.unLocode})` : "";
  const title = `${port.name}${codeTag} — Location, Terminals & UN/LOCODE`;
  const description = `${port.name}${codeTag} in ${port.city ?? port.stateName}, ${port.stateName} State: verified ${portCategoryLabel(
    port.category,
  ).toLowerCase()} profile, UN/LOCODE${port.unLocode ? ` ${port.unLocode}` : ""}, terminal operators, cargo classes, and primary NPA/UNECE sources (lastVerified ${port.lastVerified}).`;

  return pageMetadata({
    path: `/ports/${port.slug}`,
    title,
    description,
    keywords: [
      port.name,
      ...(port.alternateNames ?? []),
      ...(port.unLocode ? [port.unLocode, `${port.name} code`, `${port.unLocode} port`] : []),
      `${port.city ?? port.stateName} seaport`,
      `ports in ${port.stateName} State`,
    ],
    type: "article",
  });
}

function buildPortFaqs(port: NigerianPort): Array<{ q: string; a: string }> {
  const spaced = formatUnLocodeSpaced(port.unLocode);
  const faqs: Array<{ q: string; a: string }> = [
    {
      q: `Where is ${port.name} located in Nigeria?`,
      a: `${port.name} is located in ${port.city ? `${port.city}, ` : ""}${
        port.lgaName ? `${port.lgaName} Local Government Area, ` : ""
      }${port.stateName} State${port.waterway ? ` along ${port.waterway}` : ""}.`,
    },
  ];

  if (port.unLocode) {
    faqs.push({
      q: `What is the official UN/LOCODE for ${port.name}?`,
      a: `The official UNECE UN/LOCODE for ${port.name} is ${port.unLocode} (written ${
        spaced ?? port.unLocode
      } in UNECE tables).${
        port.subPortCodes && port.subPortCodes.length > 0
          ? ` Associated or satellite location codes within this corridor include: ${port.subPortCodes.join("; ")}.`
          : ""
      }`,
    });
  }

  if (port.operator || port.landlordAuthority) {
    faqs.push({
      q: `Who regulates and operates ${port.name}?`,
      a: `${port.landlordAuthority ? `Statutory marine and harbour oversight is exercised by ${port.landlordAuthority}. ` : ""}${
        port.operator ? `Operational structure: ${port.operator}.` : ""
      }`,
    });
  }

  faqs.push({
    q: `Can I check ship positions or book cargo shipping for ${port.name} on NaijaCheck?`,
    a: `No. NaijaCheck is an independent static public reference (lastVerified ${port.lastVerified}). We do not publish AIS ship tracking, berthing schedules, freight rates, or customs clearing quotes. Consult the Nigerian Ports Authority or the licensed terminal operator directly for operational schedules.`,
  });

  return faqs;
}

export default async function PortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const port = getPortBySlug(slug);
  if (!port) notFound();

  const path = `/ports/${port.slug}`;
  const spacedCode = formatUnLocodeSpaced(port.unLocode);
  const catLabel = portCategoryLabel(port.category);
  const faqs = buildPortFaqs(port);
  const relatedPorts = getRelatedPorts(port, 4);

  const linkedAirports = (port.relatedAirportSlugs ?? [])
    .map((aSlug) => getAirportBySlug(aSlug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const linkedOilGas = (port.relatedOilGasSlugs ?? [])
    .map((oSlug) => getOilGasOperatorBySlug(oSlug))
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  const badgeVariant =
    port.category === "deep-sea-port"
      ? "accent"
      : port.category === "commercial-seaport"
        ? "default"
        : "outline";

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${port.name}${port.unLocode ? ` (${port.unLocode})` : ""} — Nigerian Maritime Reference`,
    description: port.operationsSummary,
    url: absUrl(path),
    inLanguage: "en-NG",
    dateModified: port.lastVerified,
    isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
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
          { label: "Seaports in Nigeria", href: "/ports" },
          { label: port.name, href: path },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant}>{catLabel}</Badge>
          {port.npaZone ? <Badge variant="outline">{port.npaZone}</Badge> : null}
          {port.unLocode ? (
            <Badge variant="muted" className="font-mono">
              UN/LOCODE {port.unLocode}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Verified {port.lastVerified} · {port.verification}
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{port.name}</h1>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {port.operationsSummary}
        </p>

        <ShareControls
          title={`${port.name}${port.unLocode ? ` (${port.unLocode})` : ""} — Nigerian Seaport Profile`}
          url={absUrl(path)}
          summary={`${port.name}${port.unLocode ? ` (${port.unLocode})` : ""} in ${
            port.city ?? port.stateName
          }, ${port.stateName} State — verified terminals, cargo classes & NPA/UNECE sources (${port.lastVerified})`}
        />
      </header>

      {/* Answer-first snapshot card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Answer-first port snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                UN/LOCODE (shipping &amp; customs location code)
              </dt>
              {port.unLocode ? (
                <>
                  <dd className="mt-1.5 flex items-center gap-2.5">
                    <span className="font-mono text-xl font-extrabold tabular-nums text-foreground">
                      {port.unLocode}
                    </span>
                    <CopyButton text={port.unLocode} />
                  </dd>
                  <dd className="mt-1 text-xs text-muted-foreground">
                    UNECE format: <code className="font-mono">{spacedCode ?? port.unLocode}</code>
                  </dd>
                </>
              ) : (
                <dd className="mt-1 text-xs text-muted-foreground">
                  No standalone UNECE seaport code verified (omitted rather than guessed).
                </dd>
              )}
              {port.subPortCodes && port.subPortCodes.length > 0 ? (
                <dd className="mt-1.5 text-xs text-muted-foreground">
                  Corridor / sub-port codes: {port.subPortCodes.join(" · ")}
                </dd>
              ) : null}
            </div>

            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                City, coastal state &amp; LGA
              </dt>
              <dd className="mt-1 font-semibold text-foreground">
                {port.city ? `${port.city}, ` : ""}
                {port.stateName} State
              </dd>
              {port.locality ? (
                <dd className="mt-0.5 text-xs text-muted-foreground">{port.locality}</dd>
              ) : null}
              <dd className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <Link href={`/geo/${port.stateSlug}`} className="font-medium text-primary hover:underline">
                  {port.stateName} LGAs →
                </Link>
                {port.lgaSlug ? (
                  <Link
                    href={`/geo/${port.stateSlug}/${port.lgaSlug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {port.lgaName ?? port.lgaSlug} LGA →
                  </Link>
                ) : null}
                {port.postalHref && port.postalLabel ? (
                  <Link href={port.postalHref} className="font-medium text-primary hover:underline">
                    Postal: {port.postalLabel} →
                  </Link>
                ) : null}
              </dd>
            </div>

            <div className="rounded-lg border bg-card/50 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Port classification &amp; role
              </dt>
              <dd className="mt-1 font-semibold text-foreground">{catLabel}</dd>
              {port.role ? <dd className="mt-0.5 text-xs text-muted-foreground">{port.role}</dd> : null}
            </div>

            {port.waterway ? (
              <div className="rounded-lg border bg-card/50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Waterway &amp; maritime approach
                </dt>
                <dd className="mt-1 font-medium text-foreground">{port.waterway}</dd>
                {port.npaZone ? (
                  <dd className="mt-0.5 text-xs text-muted-foreground">NPA zone: {port.npaZone}</dd>
                ) : null}
              </div>
            ) : null}

            {(port.landlordAuthority || port.operator) ? (
              <div className="rounded-lg border bg-card/50 p-3 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Port authority &amp; operational governance
                </dt>
                {port.landlordAuthority ? (
                  <dd className="mt-1 font-semibold text-foreground">{port.landlordAuthority}</dd>
                ) : null}
                {port.operator ? (
                  <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{port.operator}</dd>
                ) : null}
              </div>
            ) : null}

            {port.cargoTypes && port.cargoTypes.length > 0 ? (
              <div className="rounded-lg border bg-card/50 p-3 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Verified cargo classes handled
                </dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {port.cargoTypes.map((cargo) => (
                    <Badge key={cargo} variant="outline" className="text-xs font-normal">
                      {cargo}
                    </Badge>
                  ))}
                </dd>
              </div>
            ) : null}

            {port.establishedNote ? (
              <div className="rounded-lg border bg-card/50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Historical &amp; concession milestone
                </dt>
                <dd className="mt-1 text-xs leading-relaxed text-foreground">{port.establishedNote}</dd>
              </div>
            ) : null}

            {port.website ? (
              <div className="rounded-lg border bg-card/50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Official reference page
                </dt>
                <dd className="mt-1 break-all">
                  <a
                    href={port.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {port.website}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>

          {port.alternateNames && port.alternateNames.length > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              <strong className="text-foreground">Common aliases &amp; search terms:</strong>{" "}
              {port.alternateNames.join(" · ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Terminal operators & key infrastructure */}
      {(port.terminalOperators && port.terminalOperators.length > 0) ||
      (port.keyFacilities && port.keyFacilities.length > 0) ||
      port.notes ? (
        <section aria-labelledby="terminals-h" className="space-y-4 rounded-xl border bg-card/40 p-5">
          <h2 id="terminals-h" className="text-lg font-bold">
            Terminals, concessionaires &amp; key marine infrastructure
          </h2>

          {port.terminalOperators && port.terminalOperators.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Verified terminal operators &amp; concessions
              </h3>
              <ul className="space-y-1.5 text-sm text-foreground">
                {port.terminalOperators.map((term) => (
                  <li key={term} className="flex items-start gap-2 leading-relaxed">
                    <span className="mt-1 text-primary">•</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {port.keyFacilities && port.keyFacilities.length > 0 ? (
            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Berths, channels &amp; corridor infrastructure
              </h3>
              <ul className="space-y-1.5 text-sm text-foreground">
                {port.keyFacilities.map((fac) => (
                  <li key={fac} className="flex items-start gap-2 leading-relaxed">
                    <span className="mt-1 text-primary">•</span>
                    <span>{fac}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {port.notes ? (
            <div className="rounded-lg border bg-background p-3.5 text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Operational &amp; coding note:</strong> {port.notes}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Factual cross-links to /airports and /oil-gas */}
      {linkedAirports.length > 0 || linkedOilGas.length > 0 ? (
        <section aria-labelledby="port-cluster-h" className="space-y-4 rounded-xl border bg-card/40 p-5">
          <h2 id="port-cluster-h" className="text-lg font-bold">
            Connected airports &amp; energy operators in this maritime corridor
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {linkedAirports.length > 0 ? (
              <div className="rounded-lg border bg-background p-3.5 text-xs">
                <p className="font-bold text-foreground">Serving commercial airports (/airports)</p>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  {linkedAirports.map((ap) => {
                    const codePair = [ap.iata, ap.icao].filter(Boolean).join(" / ");
                    return (
                      <li key={ap.slug}>
                        <Link href={`/airports/${ap.slug}`} className="font-medium text-primary hover:underline">
                          {ap.name} ({codePair})
                        </Link>{" "}
                        — {ap.city}, {ap.stateName}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {linkedOilGas.length > 0 ? (
              <div className="rounded-lg border bg-background p-3.5 text-xs">
                <p className="font-bold text-foreground">Linked oil, gas &amp; refining operators (/oil-gas)</p>
                <ul className="mt-2 space-y-1.5 text-muted-foreground">
                  {linkedOilGas.map((op) => (
                    <li key={op.slug}>
                      <Link href={`/oil-gas/${op.slug}`} className="font-medium text-primary hover:underline">
                        {op.name}
                      </Link>{" "}
                      <span className="text-[11px] text-muted-foreground">
                        ({operatorTypeShortLabel(op.type)})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Truthful FAQs */}
      <section aria-labelledby="port-faqs-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
        <h2 id="port-faqs-h" className="text-lg font-bold">
          Frequently asked questions about {port.name}
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

      {/* Primary sources */}
      <section id="sources" aria-labelledby="port-sources-h" className="space-y-3 rounded-xl border bg-card/40 p-5 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="port-sources-h" className="text-base font-bold text-foreground">
            Cited maritime &amp; regulatory sources
          </h2>
          <span className="text-muted-foreground">
            Verification: {port.verification} · lastVerified {port.lastVerified}
          </span>
        </div>

        <ul className="space-y-1.5 text-muted-foreground">
          {port.sources.map((src) => (
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
          {port.name}, the Nigerian Ports Authority (NPA), or any private terminal concessionaire. We do not publish
          shipping quotes, berth tariffs, customs clearing fees, or vessel tracking feeds.
        </p>
      </section>

      {/* Related peer ports */}
      <section aria-labelledby="peer-ports-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="peer-ports-h" className="text-base font-bold">
            Compare other major seaports &amp; marine terminals in Nigeria
          </h2>
          <Link href="/ports" className="text-xs font-semibold text-primary hover:underline">
            All 12 Nigerian ports →
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {relatedPorts.map((peer) => (
            <Link
              key={peer.slug}
              href={`/ports/${peer.slug}`}
              className="rounded-lg border bg-background p-3 text-xs transition-colors hover:border-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-foreground">{peer.name}</span>
                {peer.unLocode ? (
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {peer.unLocode}
                  </Badge>
                ) : (
                  <Badge variant="outline">{portCategoryShortLabel(peer.category)}</Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">
                {peer.city ? `${peer.city}, ` : ""}
                {peer.stateName} State · {portCategoryShortLabel(peer.category)}
              </p>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 text-xs font-medium">
          <Link href="/airports" className="text-primary hover:underline">
            Nigerian airports directory (/airports) →
          </Link>
          <Link href="/oil-gas" className="text-primary hover:underline">
            Oil &amp; gas operators (/oil-gas) →
          </Link>
          <Link href={`/geo/${port.stateSlug}`} className="text-primary hover:underline">
            {port.stateName} State LGAs (/geo/{port.stateSlug}) →
          </Link>
        </div>
      </section>

      <JsonLd data={[webPageSchema, breadcrumbSchema(path, port.name), faqSchema]} />
    </div>
  );
}
