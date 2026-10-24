import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { CopyButton } from "@/components/codes/copy-button";
import { AirportsSearch } from "@/components/airports/airports-search";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import {
  AIRPORTS_FILE_NOTES,
  AIRPORTS_FILE_SCOPE,
  airportsUpdatedAt,
  getAirportsHubSources,
  getAirportsStats,
  getAllAirports,
} from "@/lib/airports";

export const metadata: Metadata = pageMetadata({
  path: "/airports",
  title: "Airports in Nigeria — international & domestic IATA / ICAO codes",
  description:
    "24 verified public commercial airports in Nigeria: 7 designated international gateways (LOS, ABV, KAN, PHC, ENU, QUO, MIU) and 17 domestic airports — IATA & DNxx ICAO codes, cities, states, operators & cited FAAN/NCAA sources.",
  keywords: [
    "airports in Nigeria",
    "international airports in Nigeria",
    "domestic airports in Nigeria",
    "Nigeria airport codes",
    "IATA codes Nigeria",
    "ICAO codes Nigeria",
    "FAAN airports list",
    "LOS airport code",
    "ABV airport code",
  ],
});

export default function AirportsIndexPage() {
  const airports = getAllAirports();
  const stats = getAirportsStats();
  const updatedAt = airportsUpdatedAt();
  const hubSources = getAirportsHubSources();
  const intlAirports = airports.filter((a) => a.type === "international");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Airports in Nigeria", href: "/airports" },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {stats.total} public commercial airports · verified {updatedAt}
          </Badge>
          <Badge variant="outline">
            {stats.international} International · {stats.domestic} Domestic
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {stats.withIata}/{stats.total} assigned IATA · {stats.withIcao}/{stats.total} ICAO (DNxx)
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Airports in Nigeria — international &amp; domestic IATA / ICAO directory
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Copy the 3-letter <strong>IATA code</strong> (<code>LOS</code>, <code>ABV</code>, <code>KAN</code>,{" "}
          <code>PHC</code>, <code>ENU</code>, <code>QUO</code>, <code>MIU</code>) or 4-letter Nigerian{" "}
          <strong>ICAO location indicator</strong> (<code>DNMM</code>, <code>DNAA</code>…) and check each airport’s
          city, state, LGA, and operator.{" "}
          <strong>Dataset scope:</strong> {stats.total} major FAAN-operated and state/concessioned public commercial
          airports across {stats.statesCovered} Nigerian states and FCT (manually verified {updatedAt}) — not a list of
          military airbases, private oil helipads, or unscheduled bush airstrips. NaijaCheck is a static reference and
          does not provide ticket booking, airfares, or flight-tracking feeds.
        </p>

        <nav aria-label="On-page sections" className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
          <a
            href="#directory"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Filterable directory ({stats.total})
          </a>
          <a
            href="#international-gateways"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            International gateways ({stats.international})
          </a>
          <a
            href="#naming-honesty"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Why names &amp; status differ
          </a>
          <a
            href="#sources"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Sources &amp; scope
          </a>
        </nav>

        <ShareControls
          placement="inline"
          title="Airports in Nigeria — international & domestic IATA / ICAO codes"
          url={absUrl("/airports")}
          summary={`${stats.total} verified commercial airports in Nigeria (${stats.international} international, ${stats.domestic} domestic) — IATA & ICAO codes, cities & FAAN/NCAA sources (${updatedAt})`}
        />
      </header>

      <section id="directory" aria-labelledby="directory-h" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="directory-h" className="text-lg font-bold">
            Nigerian airports directory — IATA, ICAO, city &amp; scheduled status
          </h2>
          <span className="text-xs text-muted-foreground">
            Tap Copy on any IATA/ICAO code · open airport name for runway &amp; operator profile
          </span>
        </div>
        <AirportsSearch airports={airports} />
      </section>

      <section
        id="international-gateways"
        aria-labelledby="intl-h"
        className="space-y-4 rounded-xl border bg-card/40 p-4 text-sm"
      >
        <div className="space-y-1">
          <h2 id="intl-h" className="text-lg font-bold">
            International airports in Nigeria ({stats.international} federally designated gateways)
          </h2>
          <p className="text-muted-foreground">
            Five core FAAN international airports — <strong>Lagos (LOS)</strong>, <strong>Abuja (ABV)</strong>,{" "}
            <strong>Kano (KAN)</strong>, <strong>Port Harcourt (PHC)</strong>, and <strong>Enugu (ENU)</strong> — have
            anchored Nigeria’s cross-border passenger network for decades. Federal Ministry of Aviation upgrades added{" "}
            <strong>Maiduguri (MIU)</strong> for the North-East and <strong>Victor Attah Airport, Uyo (QUO)</strong>{" "}
            (which inaugurated scheduled cross-border Uyo–Accra service in May 2026), bringing federally designated
            scheduled international passenger gateways to {stats.international}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {intlAirports.map((a) => (
            <div key={a.slug} className="rounded-lg border bg-background p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/airports/${a.slug}`}
                    className="font-bold text-foreground underline-offset-2 hover:text-primary hover:underline"
                  >
                    {a.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {a.city} ·{" "}
                    <Link href={`/geo/${a.stateSlug}`} className="underline-offset-2 hover:text-primary hover:underline">
                      {a.stateName}
                    </Link>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {a.iata ? (
                    <span className="rounded border bg-secondary/50 px-2 py-0.5 font-mono text-xs font-extrabold">
                      {a.iata}
                    </span>
                  ) : null}
                  {a.icao ? (
                    <span className="rounded border px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {a.icao}
                    </span>
                  ) : null}
                </div>
              </div>
              {a.iata ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Copy IATA:</span>
                  <CopyButton text={a.iata} />
                  {a.icao ? (
                    <>
                      <span className="ml-1">ICAO:</span>
                      <CopyButton text={a.icao} />
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section id="naming-honesty" aria-labelledby="naming-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="naming-h" className="text-lg font-bold">
          Why blog lists disagree on “how many international airports Nigeria has”
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-3.5">
            <p className="font-bold">1. “International” in the name vs scheduled status</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Airports such as Sokoto (<code>SKO</code>), Ilorin (<code>ILR</code>), Calabar (<code>CBQ</code>), Owerri (
              <code>QOW</code>), Asaba (<code>ABB</code>), Minna (<code>MXJ</code>), and Umueri (<code>DNAN</code>) carry
              “International” in their official or cargo titles, yet FAAN and airlines operate them primarily as
              scheduled domestic passenger terminals (with customs activated for Hajj charters or cargo).
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3.5">
            <p className="font-bold">2. Federal ceremonial renamings</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Federal directives renamed over a dozen airports after national leaders and aviation pioneers (for
              example, Benin → Oba Akenzua II, Akure → Olumuyiwa Bernard Aliu, Ibadan → Samuel Ladoke Akintola, Minna →
              Bola Ahmed Tinubu). Both common city names and official ceremonial titles are indexed here so searchers
              find the right code either way.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3.5">
            <p className="font-bold">3. Unassigned global IATA codes omitted</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              We never guess 3-letter codes. For Chinua Achebe Airport in Umueri, Anambra (<code>DNAN</code>), domestic
              booking engines use <code>ANA</code> locally, whereas IATA’s global registry assigns <code>ANA</code> to
              Anaa Airport in French Polynesia — so we omit global IATA and explain the distinction transparently.
            </p>
          </div>
        </div>
      </section>

      <section id="sources" aria-labelledby="sources-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sources-h" className="text-lg font-bold">
            Sources, dataset scope &amp; verification ({updatedAt})
          </h2>
          <Badge variant="outline">Manual verification · ₦0 static archive</Badge>
        </div>
        {AIRPORTS_FILE_SCOPE ? <p className="text-muted-foreground">{AIRPORTS_FILE_SCOPE}</p> : null}
        {AIRPORTS_FILE_NOTES ? <p className="text-xs leading-relaxed text-muted-foreground">{AIRPORTS_FILE_NOTES}</p> : null}

        <ul className="space-y-2 pt-1">
          {hubSources.map((s) => (
            <li key={s.url} className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <Badge variant={s.kind === "primary" ? "accent" : "outline"} className="text-[10px] uppercase">
                {s.kind === "primary" ? "Primary" : "Secondary"}
              </Badge>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="related-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="related-h" className="text-base font-bold">
          Related Nigerian reference hubs
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/airlines"
            className="rounded-lg border bg-background p-3.5 transition-colors hover:border-primary/60"
          >
            <p className="font-bold text-foreground">Airlines in Nigeria (Past &amp; Present) →</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Active, suspended, and historical Nigerian passenger airlines with IATA/ICAO codes and hub airports.
            </p>
          </Link>
          <Link
            href="/geo"
            className="rounded-lg border bg-background p-3.5 transition-colors hover:border-primary/60"
          >
            <p className="font-bold text-foreground">Nigeria 774 LGAs &amp; States →</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Browse all 36 states + FCT and verify which Local Government Area hosts each aerodrome.
            </p>
          </Link>
          <Link
            href="/codes"
            className="rounded-lg border bg-background p-3.5 transition-colors hover:border-primary/60"
          >
            <p className="font-bold text-foreground">Bank Sort, USSD &amp; Postal Codes →</p>
            <p className="mt-1 text-xs text-muted-foreground">
              6-digit NIPOST postal codes by state plus 3-digit CBN/NIP bank codes and USSD shortcuts.
            </p>
          </Link>
          <Link
            href="/rates"
            className="rounded-lg border bg-background p-3.5 transition-colors hover:border-primary/60"
          >
            <p className="font-bold text-foreground">CBN Official vs Parallel Dollar Archive →</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dated NFEM official closing rates and parallel USD buy readings with full historical tables.
            </p>
          </Link>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/airports", "Airports in Nigeria"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Airports in Nigeria — international & domestic IATA / ICAO directory",
            description:
              "24 verified public commercial airports in Nigeria (7 federally designated international gateways and 17 domestic commercial airports) with IATA and ICAO codes, cities, states, operators, and cited sources.",
            url: absUrl("/airports"),
            inLanguage: "en-NG",
            dateModified: updatedAt,
            isPartOf: {
              "@type": "WebSite",
              name: SITE_CONFIG.name,
              url: SITE_CONFIG.url,
            },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: airports.length,
              itemListElement: airports.map((a, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: `${a.name} (${[a.iata, a.icao].filter(Boolean).join(" / ")})`,
                url: absUrl(`/airports/${a.slug}`),
              })),
            },
          },
        ]}
      />
    </div>
  );
}
