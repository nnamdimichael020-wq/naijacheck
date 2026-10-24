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
  getAggregatedStateSources,
  getAllPostalAreaParams,
  getAllPostalStateSlugs,
  getAllPostalStates,
  getPostalPlace,
  getPostalState,
} from "@/lib/postal";
import { getLgaState } from "@/lib/lgas";
import { getAirportsByState } from "@/lib/airports";
import { getPortsByStateSlug } from "@/lib/ports";

export const dynamicParams = false;

function formatStateLabel(name: string, slug: string): string {
  return slug === "fct-abuja" ? name : `${name} State`;
}

export async function generateStaticParams() {
  return getAllPostalStateSlugs().map((state) => ({ state }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const s = getPostalState(state);
  if (!s) return { title: "Not found" };
  const stateLabel = formatStateLabel(s.name, s.slug);
  const title = `${stateLabel} postal codes (ZIP) — ${s.headOfficeCode} + ${s.places.length - 1} verified areas`;
  const samplePlaces = s.places
    .slice(1, 5)
    .map((p) => `${p.name.split("—")[0].replace(/\s*\(.*?\)\s*/g, "").trim()} ${p.code}`)
    .join(", ");
  const description = `${stateLabel} postal codes (ZIP): head office ${s.headOfficeCode} (${s.capital}) plus ${s.places.length - 1} verified NIPOST delivery codes (${samplePlaces}) — with 1-tap copy, public sources and conflict notes. Verified ${s.lastVerified}.`;
  return pageMetadata({
    path: `/codes/postal/${s.slug}`,
    title,
    description,
    keywords: [
      `${s.name} postal code`,
      `${s.name} ZIP code`,
      `${s.capital} postal code ${s.headOfficeCode}`,
      `${s.name} postal codes list`,
      `NIPOST ${s.name}`,
      `ZIP code for ${s.name}`,
    ],
  });
}

function Faq({ s }: { s: NonNullable<ReturnType<typeof getPostalState>> }) {
  const stateLabel = formatStateLabel(s.name, s.slug);
  const faqs = [
    {
      q: `Can I use one code for all of ${stateLabel}?`,
      a:
        s.slug === "lagos"
          ? `No. Lagos has no single ZIP — Ikeja GPO is 100001, while Victoria Island is 101241, Lekki Phase 1 is 105102, Ajah is 105101 (or 101245 on older Eti-Osa splits), Yaba is 101212, and Ikorodu is 104101. Pick the district row matching your street; use 100001 only as a fallback alongside your full street and LGA.`
          : s.slug === "fct-abuja"
          ? `No. FCT Abuja spans 6 Area Councils (900001–905001) — Garki GPO is 900001, Maitama is 900271, Wuse Zone 1 is 900281, Wuse II is 900288, Gwarinpa/Jabi is 900108, and Kubwa is 901101. Use your district or satellite-town code whenever listed.`
          : `No. ${s.headOfficeCode} is the head-office/GPO code for ${s.capital}. Secondary cities and LGAs in ${stateLabel} (${s.range ?? `${s.zoneCode}xxx`}) carry distinct delivery codes. Select the row closest to your address and only fall back to ${s.headOfficeCode} if your specific town is not yet verified.`,
    },
    {
      q: `Is ${s.headOfficeCode} the “official ZIP” for ${stateLabel}?`,
      a: `${s.headOfficeCode} is the NIPOST General Post Office (GPO) code for ${s.capital} (ending 001). International checkouts and bank KYC forms accept it for ${s.capital}, while commercial towns and districts listed in the table above have their own 6-digit delivery codes.`,
    },
    {
      q: `What about the new 11-character NIPOST NDAPS code?`,
      a: `On 1 Oct 2026 NIPOST introduced the National Digital Alphanumeric Postcode System (NDAPS) — an 11-character building-level code. Standard online forms, customs declarations, and courier checkouts still expect the 6-digit numeric postal codes shown on this page unless NDAPS is explicitly requested.`,
    },
    {
      q: `Why isn’t every village or street in ${stateLabel} listed here?`,
      a: `NaijaCheck only publishes 6-digit codes verified in citable public compilations — never guessed or sequentially padded village numbers. If your street isn’t in the ${s.places.length} verified places above, enter ${s.headOfficeCode} (or your LGA’s nearest verified town code) plus your full street and LGA name, or confirm at your local NIPOST post office counter.`,
    },
  ];
  return (
    <section aria-labelledby="faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
      <h2 id="faq" className="text-lg font-bold">Frequently asked questions — {stateLabel}</h2>
      <div className="space-y-4">
        {faqs.map((f) => (
          <div key={f.q}>
            <h3 className="text-sm font-semibold">{f.q}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function PostalStatePage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const s = getPostalState(state);
  if (!s) notFound();
  const stateLabel = formatStateLabel(s.name, s.slug);
  const path = `/codes/postal/${s.slug}`;
  const allStates = getAllPostalStates();
  const sameZoneStates = allStates.filter((x) => x.slug !== s.slug && x.geopoliticalZone === s.geopoliticalZone);
  const fallbackStates = allStates.filter((x) => x.slug !== s.slug && x.geopoliticalZone !== s.geopoliticalZone);
  const otherStates = [...sameZoneStates, ...fallbackStates].slice(0, 6);

  const areaParams = getAllPostalAreaParams();
  const leafSet = new Set(areaParams.map((l) => `${l.state}:${l.area}`));
  const stateLeaves = areaParams
    .filter((l) => l.state === s.slug)
    .map((l) => getPostalPlace(l.state, l.area))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const aggregatedSources = getAggregatedStateSources(s);
  const lgaState = getLgaState(s.slug);
  const stateAirports = getAirportsByState(s.slug);
  const statePorts = getPortsByStateSlug(s.slug);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Nigerian codes", href: "/codes" },
          { label: "Postal codes", href: "/codes/postal" },
          { label: s.name, href: path },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            Head office {s.headOfficeCode} · {s.geopoliticalZone} · {s.range ?? `${s.zoneCode}xxx`}
          </Badge>
          <Badge variant="outline">
            {s.places.length} verified places · {s.lastVerified}
          </Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {stateLabel} postal codes (ZIP) — verified list by area
        </h1>
        <p className="text-muted-foreground">
          {s.intro} Head office is <strong>{s.headOfficeCode}</strong> ({s.capital}). Below are{" "}
          <strong>{s.places.length} verified 6-digit NIPOST postal codes</strong> across {stateLabel} — covering the GPO,
          major urban districts, university corridors and commercial towns (not every individual street). Pick the row
          matching your town or district to prevent courier misrouting.
        </p>
        <ShareControls
          placement="inline"
          title={`${stateLabel} postal codes — ${s.headOfficeCode} + ${s.places.length - 1} areas`}
          url={absUrl(path)}
          summary={`${stateLabel}: ${s.headOfficeCode} (${s.capital}) + ${s.places.length - 1} verified NIPOST codes with sources (${s.lastVerified})`}
        />
      </header>

      <section aria-labelledby="head-code" className="space-y-3">
        <h2 id="head-code" className="text-xl font-bold">Head office code — {stateLabel}</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">GPO / head office ({s.capital})</CardTitle>
            <p className="text-xs text-muted-foreground">
              {s.capital} · {s.geopoliticalZone} · range {s.range ?? `${s.zoneCode}xxx`}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3">
              <div>
                <p className="font-mono text-lg font-extrabold tabular-nums">{s.headOfficeCode}</p>
                <p className="text-xs text-muted-foreground">Head office / GPO — primary code for {s.capital}</p>
              </div>
              <CopyButton text={s.headOfficeCode} />
            </div>
            <p className="text-xs text-muted-foreground">
              Last verified {s.lastVerified} · verification: manual{s.notes ? ` · ${s.notes}` : ""}
            </p>
            {stateLeaves.length > 0 ? (
              <div className="pt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Curated district &amp; city guides: </span>
                {stateLeaves.map(({ place: lp }, i) => (
                  <span key={lp.slug}>
                    {i ? " · " : null}
                    <Link
                      href={`/codes/postal/${s.slug}/${lp.slug}`}
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      {lp.name.split("—")[0].replace(/\s*\(.*?\)\s*/g, "").trim()} ({lp.code})
                    </Link>
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="places" className="space-y-3">
        <h2 id="places" className="text-xl font-bold">
          All verified places — {stateLabel} ({s.places.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Each row lists a verified district, town or LGA hub, its 6-digit NIPOST code, a 1-tap copy button and any
          multi-source conflict notes. Unlisted streets or villages are omitted rather than guessed — use the nearest
          verified code plus your full street address.
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Place | 6-digit code | copy | delivery &amp; conflict notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-2 py-2 font-semibold">Place / District</th>
                    <th className="px-2 py-2 font-semibold">Postal code</th>
                    <th className="px-2 py-2 font-semibold">Copy</th>
                    <th className="px-2 py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {s.places.map((p) => {
                    const isLeaf = Boolean(p.slug && leafSet.has(`${s.slug}:${p.slug}`));
                    return (
                      <tr key={(p.slug ?? p.name) + p.code} className="border-b last:border-0">
                        <td className="px-2 py-2.5">
                          {isLeaf ? (
                            <Link
                              href={`/codes/postal/${s.slug}/${p.slug}`}
                              className="font-semibold text-primary underline-offset-2 hover:underline"
                            >
                              {p.name} →
                            </Link>
                          ) : (
                            <span className="font-semibold">{p.name}</span>
                          )}
                          {p.label ? <span className="block text-xs text-muted-foreground">{p.label}</span> : null}
                        </td>
                        <td className="px-2 py-2.5 font-mono font-bold tabular-nums">{p.code}</td>
                        <td className="px-2 py-2.5">
                          <CopyButton text={p.code} />
                        </td>
                        <td className="px-2 py-2.5 text-xs text-muted-foreground">{p.notes ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Codes ending <code>001</code> denote NIPOST General Post Offices; other endings denote urban delivery
              layouts or LGA post offices. Where public compilations disagree, we record the alternative code directly in
              Notes and cite all sources below.
            </p>
          </CardContent>
        </Card>
      </section>

      {(lgaState || stateAirports.length > 0 || statePorts.length > 0) ? (
        <section aria-labelledby="local-context" className="space-y-3 rounded-xl border bg-card/40 p-4">
          <h2 id="local-context" className="text-base font-bold">
            LGAs, airports &amp; seaports in {stateLabel}
          </h2>
          <div className="space-y-2.5 text-sm">
            {lgaState ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Local Government Areas ({lgaState.count})
                </p>
                <p className="mt-1 text-sm">
                  <Link
                    href={`/geo/${s.slug}`}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    Browse all {lgaState.count} {s.slug === "fct-abuja" ? "Area Councils" : "LGAs"} in {stateLabel} →
                  </Link>
                  {lgaState.lgas.length > 0 ? (
                    <span className="text-muted-foreground">
                      {" · "}Includes{" "}
                      {lgaState.lgas.slice(0, 6).map((l, idx) => (
                        <span key={l.slug}>
                          {idx ? ", " : null}
                          <Link href={`/geo/${s.slug}/${l.slug}`} className="underline-offset-2 hover:text-primary hover:underline">
                            {l.name}
                          </Link>
                        </span>
                      ))}
                      {lgaState.lgas.length > 6 ? ` and ${lgaState.lgas.length - 6} more` : ""}.
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}

            {stateAirports.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Commercial airport{stateAirports.length === 1 ? "" : "s"} in {stateLabel}
                </p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {stateAirports.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/airports/${a.slug}`}
                        className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                      >
                        {a.name} ({a.iata ?? a.icao}) →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {statePorts.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Seaports &amp; marine terminals in {stateLabel}
                </p>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {statePorts.map((pt) => (
                    <li key={pt.slug}>
                      <Link
                        href={`/ports/${pt.slug}`}
                        className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                      >
                        {pt.name} ({pt.unLocode}) →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="sources" className="space-y-2 rounded-xl border bg-card/40 p-4">
        <h2 id="sources" className="text-base font-bold">
          Sources &amp; how this page is verified ({aggregatedSources.length} distinct public references)
        </h2>
        <p className="text-xs text-muted-foreground">
          Every 6-digit code in the table above appears in at least one citable public compilation linked below — zero
          codes are guessed. NIPOST’s corporate portal (<code>nipost.gov.ng</code>) also operates the 11-character NDAPS
          addressing system launched 1 Oct 2026; where local delivery boundaries shift, your local NIPOST counter is
          authoritative. Last manual verification: {s.lastVerified}.
        </p>
        <ul className="space-y-2 text-sm">
          {aggregatedSources.map((src) => (
            <li key={src.url} className="space-y-0.5">
              <div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {src.label}
                </a>{" "}
                <span className="ml-1 break-all text-xs text-muted-foreground">{src.url}</span>
              </div>
              {src.placesCovered.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Covers: {src.placesCovered.join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <Faq s={s} />

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">
          More states in {s.geopoliticalZone} &amp; across Nigeria
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {otherStates.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/codes/postal/${o.slug}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary"
              >
                <span className="font-semibold">{o.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {o.headOfficeCode} · {o.places.length} places →
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          <Link href="/codes/postal" className="font-semibold text-primary underline-offset-2 hover:underline">
            All {allStates.length} states + FCT →
          </Link>{" "}
          ·{" "}
          <Link href="/geo" className="font-semibold text-primary underline-offset-2 hover:underline">
            774 LGAs (/geo)
          </Link>{" "}
          ·{" "}
          <Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">
            Bank codes
          </Link>{" "}
          ·{" "}
          <Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">
            Codes hub
          </Link>
        </p>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema(path, s.name),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${stateLabel} postal codes — ${s.headOfficeCode} + ${s.places.length - 1} areas`,
            description: `${stateLabel} postal codes: ${s.headOfficeCode} (${s.capital}) + ${s.places.length - 1} verified district and town codes with public sources.`,
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
                name: `Can I use one code for all of ${stateLabel}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `No — ${s.headOfficeCode} is the GPO head office for ${s.capital}; districts and secondary towns use distinct 6-digit NIPOST codes.`,
                },
              },
              {
                "@type": "Question",
                name: `Is ${s.headOfficeCode} the official ZIP for ${stateLabel}?`,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `${s.headOfficeCode} is the NIPOST head-office code for ${s.capital} (ending 001).`,
                },
              },
            ],
          },
        ]}
      />
    </div>
  );
}
