import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import {
  getAllPostalAreaParams,
  getAllPostalStates,
  getPostalPlace,
  POSTAL_FILE_UPDATED_AT,
  postalPlaceCount,
} from "@/lib/postal";
import { PostalSearch } from "@/components/codes/postal-search";

export const metadata: Metadata = pageMetadata({
  path: "/codes/postal",
  title: "Nigeria postal codes (ZIP) — all 36 states + FCT, verified 6-digit NIPOST codes by area",
  description:
    "Verified 6-digit NIPOST postal / ZIP codes across all 36 Nigerian states + FCT: 262 sourced GPOs, urban districts, LGA seats and commercial cities with 1-tap copy and conflict notes. Lagos 100001, Abuja 900001, Port Harcourt 500001, Aba 450101, Onitsha 430001. Last verified 2026-10-24.",
  keywords: [
    "Nigeria postal codes",
    "Nigeria ZIP code",
    "Lagos postal code",
    "Abuja postal code",
    "Port Harcourt ZIP code",
    "Aba postal code",
    "Onitsha postal code",
    "NIPOST postal codes",
    "Lagos ZIP code 100001",
    "Abuja ZIP 900001",
    "Nigeria ZIP codes list",
  ],
});

export default function PostalHubPage() {
  const states = getAllPostalStates();
  const updatedAt = POSTAL_FILE_UPDATED_AT ?? "2026-10-24";
  const places = postalPlaceCount();
  const areaParams = getAllPostalAreaParams();
  const curatedLeafKeys = areaParams.map(({ state, area }) => `${state}/${area}`);
  const curatedLeaves = areaParams
    .map(({ state, area }) => getPostalPlace(state, area))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Nigerian codes", href: "/codes" },
          { label: "Postal codes", href: "/codes/postal" },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">36 states + FCT · {places} verified places</Badge>
          <Badge variant="outline">{curatedLeaves.length} district guides</Badge>
          <span className="text-xs font-medium text-muted-foreground">Updated {updatedAt} · manual · ₦0 · zero guessed codes</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Nigeria postal codes (ZIP) — 6-digit NIPOST codes by state &amp; district
        </h1>
        <p className="text-muted-foreground">
          Nigeria uses <strong>6-digit numeric postal codes</strong> issued by <strong>NIPOST</strong> — never a single
          national code like <code>000000</code> or <code>23401</code>. The first digit identifies the postal region
          (1–9), the first three digits identify the dispatch sorting centre, and the last three digits identify the
          delivery post office or district. Head offices end in <code>001</code> (Ikeja <code>100001</code>, Garki{" "}
          <code>900001</code>, Port Harcourt <code>500001</code>). On{" "}
          <strong>1 Oct 2026 NIPOST also introduced the 11-character National Digital Alphanumeric Postcode (NDAPS)</strong>{" "}
          per building — keep entering your 6-digit code on international checkouts, bank KYC, customs and courier forms
          unless a portal explicitly asks for NDAPS.
        </p>
        <ShareControls
          placement="inline"
          title="Nigeria postal codes (ZIP) — all 36 states + FCT"
          url={absUrl("/codes/postal")}
          summary={`36 states + FCT — ${places} verified NIPOST 6-digit codes with 1-tap copy and public sources (${updatedAt})`}
        />
      </header>

      <section aria-labelledby="honest-coverage" className="space-y-2 rounded-xl border bg-card/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="honest-coverage" className="text-base font-bold">
            Honest coverage — verified districts &amp; towns, not every street in Nigeria
          </h2>
          <Badge variant="muted">Editorial rule</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          This archive curates <strong>{places} source-verified GPOs, major urban districts, university corridors, LGA seats and commercial cities</strong> across all{" "}
          <strong>36 states + FCT</strong> — <strong>not every street, estate or village in Nigeria</strong>. We never invent
          6-digit numbers or pad states with sequential guesses. Every code below is backed by at least one public
          NIPOST-based compilation linked on-page, and where two directories disagree (for example{" "}
          <Link href="/codes/postal/lagos/ajah" className="font-semibold text-primary underline-offset-2 hover:underline">
            Ajah 105101 vs 101245
          </Link>{" "}
          or{" "}
          <Link href="/codes/postal/ebonyi" className="font-semibold text-primary underline-offset-2 hover:underline">
            Ebonyi 480103 vs 840001
          </Link>
          ), we document both in plain English. If your exact street isn’t listed yet, copy your state’s{" "}
          <code>001</code> head-office code and write your full street, town and LGA in the address lines.
        </p>
      </section>

      <section aria-labelledby="how-it-works" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="how-it-works" className="text-xl font-bold">How a Nigerian “ZIP” works — in 15 seconds</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong>First digit</strong> = postal region (<code>1</code> = Lagos/Ogun, <code>2</code> = Oyo/Osun/Kwara/Kogi,{" "}
            <code>3</code> = Edo/Delta/Ondo/Ekiti, <code>4</code> = South-East, <code>5</code> = Rivers/Akwa Ibom/Cross River/Bayelsa,{" "}
            <code>6</code> = North-East, <code>7</code> = Kano/Jigawa/Bauchi/Gombe, <code>8</code> = Kaduna/Katsina/Sokoto/Kebbi/Zamfara,{" "}
            <code>9</code> = Abuja/Niger/Plateau/Nasarawa/Benue).
          </li>
          <li>
            <strong>First three digits</strong> = dispatch sorting centre (e.g. <code>100</code> Ikeja mainland,{" "}
            <code>101</code> Lagos Island/Eti-Osa, <code>450</code> Aba, <code>900</code> Abuja AMAC).
          </li>
          <li>
            <strong>Last three digits</strong> = delivery post office or urban layout. Crossing an expressway or LGA boundary
            frequently changes these last three digits.
          </li>
          <li>
            <strong>Ending 001</strong> = General Post Office (GPO) / head office for that dispatch zone.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Example: Victoria Island <code>101241</code> — <code>1</code> = South-West region, <code>101</code> = Lagos Island
          dispatch, <code>241</code> = VI delivery. Aba <code>450101</code> — <code>4</code> = South-East region,{" "}
          <code>450</code> = Aba dispatch (distinct from Umuahia <code>440001</code>), <code>101</code> = Aba North delivery.
        </p>
      </section>

      <section aria-labelledby="search" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="search" className="text-lg font-bold">Search {places} verified places across all 36 states + FCT</h2>
          <span className="text-xs text-muted-foreground">Instant filter · 1-tap copy</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Type a city, district, LGA or 6-digit code — e.g. “Aba”, “Ajah”, “Wuse II”, “Sango-Ota”, “105102” or “Nsukka” — or
          filter by geopolitical zone.
        </p>
        <PostalSearch states={states} curatedLeafKeys={curatedLeafKeys} />
      </section>

      <section aria-labelledby="curated-districts" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="curated-districts" className="text-xl font-bold">
            High-intent city &amp; district guides ({curatedLeaves.length})
          </h2>
          <Badge variant="outline">Curated leaves</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Major commercial hubs where using the state capital’s <code>001</code> GPO code causes courier misrouting or
          checkout mismatches — each with neighbour comparisons and local delivery notes.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {curatedLeaves.map(({ state: s, place: p }) => (
            <li key={`${s.slug}/${p.slug}`}>
              <Link
                href={`/codes/postal/${s.slug}/${p.slug}`}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-sm hover:border-primary"
              >
                <span className="truncate pr-2 font-semibold">
                  {p.name.split("—")[0].replace(/\s*\(.*?\)\s*/g, "").trim()}{" "}
                  <span className="text-xs font-normal text-muted-foreground">({s.name})</span>
                </span>
                <span className="shrink-0 font-mono text-xs font-bold text-primary">{p.code} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="states-grid" className="space-y-3">
        <h2 id="states-grid" className="text-xl font-bold">All 36 states + FCT — quick directory</h2>
        <p className="text-sm text-muted-foreground">
          Every state page now covers both its capital GPO and verified secondary towns or metropolitan districts, with
          1-tap copy buttons, public source links, and links to matching LGAs, airports and seaports.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {states.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/codes/postal/${s.slug}`}
                className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary"
              >
                <span className="font-semibold">{s.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {s.headOfficeCode} · {s.places.length} places →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related Nigerian directories</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <li>
            <Link href="/geo" className="font-semibold text-primary underline-offset-2 hover:underline">
              All 774 LGAs by state (/geo)
            </Link>
          </li>
          <li>
            <Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">
              Bank sort &amp; USSD codes
            </Link>
          </li>
          <li>
            <Link href="/ports" className="font-semibold text-primary underline-offset-2 hover:underline">
              Major seaports &amp; terminals
            </Link>
          </li>
          <li>
            <Link href="/airports" className="font-semibold text-primary underline-offset-2 hover:underline">
              Nigerian airports (IATA/ICAO)
            </Link>
          </li>
          <li>
            <Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">
              Codes hub
            </Link>
          </li>
          <li>
            <Link href="/status" className="text-muted-foreground underline-offset-2 hover:underline">
              How we verify sources
            </Link>
          </li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/codes/postal", "Postal codes"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Nigeria postal codes (ZIP) — all 36 states + FCT",
            description: `All 36 states + FCT postal/ZIP codes: ${places} verified 6-digit NIPOST codes by district and town with public sources.`,
            url: absUrl("/codes/postal"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: updatedAt,
          },
        ]}
      />
    </div>
  );
}
