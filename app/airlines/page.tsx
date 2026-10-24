import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { AirlinesSearch, type HubAirportChip } from "@/components/airlines/airlines-search";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { getAllAirports } from "@/lib/airports";
import {
  AIRLINES_FILE_NOTES,
  AIRLINES_FILE_SCOPE,
  airlineCodeSummary,
  airlinesUpdatedAt,
  getAirlinesByStatus,
  getAirlinesHubSources,
  getAirlinesStats,
  getAllAirlines,
} from "@/lib/airlines";

export const metadata: Metadata = pageMetadata({
  path: "/airlines",
  title: "Airlines in Nigeria — Active, Suspended & Historical IATA / ICAO Directory",
  description:
    "23 verified scheduled passenger airlines in Nigeria (past and present): 11 operating carriers (Air Peace P4, Ibom Air QI, United Nigeria U5, ValueJet VK…), 2 suspended carriers (Dana Air, Azman Air), and 10 historical airlines (Nigeria Airways WT, Bellview B3, Virgin Nigeria / Air Nigeria…) with IATA & ICAO codes, hub airports, and NCAA/IATA sources.",
  keywords: [
    "airlines in Nigeria",
    "list of airlines in Nigeria",
    "domestic airlines in Nigeria",
    "active airlines in Nigeria",
    "defunct airlines in Nigeria",
    "Nigerian airline IATA codes",
    "Nigerian airline ICAO codes",
    "Air Peace IATA code",
    "Ibom Air code",
  ],
});

const HUB_FAQS = [
  {
    q: "How many scheduled passenger airlines are currently operating in Nigeria?",
    a: "Our manually verified directory records 11 active Nigerian scheduled passenger carriers (Air Peace, Ibom Air, United Nigeria Airlines, ValueJet, Overland Airways, Green Africa Airways, Arik Air, Aero Contractors, Max Air, Rano Air, and XEJet), alongside 2 carriers whose scheduled domestic operations remain suspended (Dana Air and Azman Air) and 10 landmark historical Nigerian airlines that ceased operations between 1997 and 2019.",
  },
  {
    q: "Why do two airlines in Nigeria's history share the IATA code VK?",
    a: "Unlike 3-letter airport codes, IATA periodically reassigns 2-character airline designators after a carrier permanently ceases operations. Virgin Nigeria (later Nigerian Eagle and Air Nigeria) held IATA code VK from 2005 until it closed in September 2012; years later, IATA assigned VK to active Nigerian carrier ValueJet (ICAO: FVJ), while Air Nigeria's 3-letter ICAO designators (VGN, then ANP) remain distinct.",
  },
  {
    q: "Are Dana Air and Azman Air still flying scheduled domestic flights?",
    a: "In our reference (verified 2026-10-24), both are recorded as suspended rather than operating: the Nigeria Civil Aviation Authority (NCAA) suspended Dana Air's Air Operator Certificate in April 2024 pending a safety and financial audit, while Azman Air indefinitely halted scheduled domestic flights in August 2024 amid fleet maintenance delays.",
  },
  {
    q: "Does NaijaCheck sell flight tickets or show airfares and flight timetables?",
    a: "No. NaijaCheck is a static Nigerian public-interest reference for verified airline operating status, IATA and ICAO designators, hub airports, corporate history, and regulatory citations. Always check directly with an active NCAA-licensed airline before planning travel.",
  },
] as const;

export default function AirlinesIndexPage() {
  const airlines = getAllAirlines();
  const stats = getAirlinesStats();
  const updatedAt = airlinesUpdatedAt();
  const hubSources = getAirlinesHubSources();
  const operatingAirlines = getAirlinesByStatus("operating");
  const suspendedAirlines = getAirlinesByStatus("suspended");

  const allAirports = getAllAirports();
  const airportLookup: Record<string, HubAirportChip> = {};
  for (const ap of allAirports) {
    airportLookup[ap.slug] = {
      slug: ap.slug,
      city: ap.city,
      code: ap.iata ?? ap.icao ?? ap.slug.toUpperCase(),
    };
  }

  const majorHubs = [
    "lagos-murtala-muhammed",
    "abuja-nnamdi-azikiwe",
    "port-harcourt-international",
    "kano-mallam-aminu-kano",
    "uyo-victor-attah",
    "enugu-akanu-ibiam",
  ]
    .map((slug) => allAirports.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Airlines in Nigeria", href: "/airlines" },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {stats.total} scheduled airlines · verified {updatedAt}
          </Badge>
          <Badge variant="outline">
            {stats.operating} Operating · {stats.suspended} Suspended · {stats.historicalTotal} Historical
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {stats.withIata}/{stats.total} IATA · {stats.withIcao}/{stats.total} ICAO designators
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Airlines in Nigeria — active, suspended &amp; historical IATA / ICAO reference
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Check which Nigerian passenger airlines are <strong>actively operating</strong>, which have{" "}
          <strong>suspended scheduled operations</strong>, and which are <strong>historical / defunct carriers</strong>{" "}
          — with copyable 2-character <strong>IATA</strong> (<code>P4</code>, <code>QI</code>, <code>U5</code>,{" "}
          <code>VK</code>, <code>OF</code>, <code>Q9</code>, <code>W3</code>, <code>N2</code>, <code>VM</code>,{" "}
          <code>R4</code>, <code>4U</code>) and 3-letter <strong>ICAO</strong> designators, hub airports, and cited
          NCAA/IATA records. <strong>Dataset scope:</strong> {stats.total} major scheduled passenger airlines in Nigeria
          from 1958 to the present (verified {updatedAt}) — excluding private charter-only jets, helicopter-only
          contractors, cargo-only fleets, and unverified single-plane operators. NaijaCheck does not sell tickets,
          quote airfares, or publish flight timetables.
        </p>

        <nav aria-label="On-page sections" className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
          <a
            href="#directory"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Filterable directory ({stats.total})
          </a>
          <a
            href="#status-guide"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Operating vs suspended ({stats.operating} / {stats.suspended})
          </a>
          <a
            href="#hub-airports"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Major Nigerian hub airports
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
          title="Airlines in Nigeria — Active, Suspended & Historical IATA / ICAO Directory"
          url={absUrl("/airlines")}
          summary={`${stats.total} verified Nigerian scheduled airlines (${stats.operating} operating, ${stats.suspended} suspended, ${stats.historicalTotal} historical) — IATA/ICAO designators, hubs & NCAA sources (${updatedAt})`}
        />
      </header>

      <section id="directory" aria-labelledby="directory-h" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="directory-h" className="text-lg font-bold">
            Nigerian airlines directory — status, IATA, ICAO &amp; hub airports
          </h2>
          <span className="text-xs text-muted-foreground">
            Tap Copy on any IATA/ICAO designator · open an airline for regulatory status &amp; sources
          </span>
        </div>
        <AirlinesSearch airlines={airlines} airportLookup={airportLookup} />
      </section>

      <section id="status-guide" aria-labelledby="status-h" className="space-y-4 rounded-xl border bg-card/40 p-4 text-sm">
        <div className="space-y-1">
          <h2 id="status-h" className="text-lg font-bold">
            How we verify operating, suspended &amp; historical airline status
          </h2>
          <p className="text-muted-foreground">
            Many online lists mix active NCAA-licensed passenger airlines with grounded or long-liquidated carriers.
            NaijaCheck separates Nigerian scheduled passenger airlines into three sourced groups so travellers and
            researchers never confuse an inactive brand with an operating airline:
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-foreground">Operating ({operatingAirlines.length})</h3>
              <Badge variant="accent" className="text-[10px]">
                Active AOC
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Carriers holding an active NCAA Air Operator Certificate with verified scheduled passenger flights — from{" "}
              <Link href="/airlines/air-peace" className="font-semibold text-primary hover:underline">
                Air Peace (P4)
              </Link>{" "}
              and{" "}
              <Link href="/airlines/ibom-air" className="font-semibold text-primary hover:underline">
                Ibom Air (QI)
              </Link>{" "}
              to{" "}
              <Link href="/airlines/united-nigeria-airlines" className="font-semibold text-primary hover:underline">
                United Nigeria (U5)
              </Link>
              ,{" "}
              <Link href="/airlines/valuejet" className="font-semibold text-primary hover:underline">
                ValueJet (VK)
              </Link>
              , and{" "}
              <Link href="/airlines/overland-airways" className="font-semibold text-primary hover:underline">
                Overland (OF)
              </Link>
              . Includes{" "}
              <Link href="/airlines/arik-air" className="font-semibold text-primary hover:underline">
                Arik Air (W3)
              </Link>{" "}
              and{" "}
              <Link href="/airlines/aero-contractors" className="font-semibold text-primary hover:underline">
                Aero Contractors (N2)
              </Link>{" "}
              (active under AMCON management) plus{" "}
              <Link href="/airlines/max-air" className="font-semibold text-primary hover:underline">
                Max Air (VM)
              </Link>{" "}
              (cleared by NCAA audit in March 2025).
            </p>
          </div>

          <div className="rounded-lg border bg-background p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-foreground">Suspended ({suspendedAirlines.length})</h3>
              <Badge variant="muted" className="text-[10px]">
                Grounded
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Established carriers that have not been formally liquidated in historic registries, but whose scheduled
              domestic passenger flights remain halted as of {updatedAt}:{" "}
              <Link href="/airlines/dana-air" className="font-semibold text-primary hover:underline">
                Dana Air (9J)
              </Link>{" "}
              (AOC suspended by NCAA in April 2024 for safety/financial audit) and{" "}
              <Link href="/airlines/azman-air" className="font-semibold text-primary hover:underline">
                Azman Air (AZM)
              </Link>{" "}
              (indefinite domestic suspension in August 2024 over fleet maintenance delays).
            </p>
          </div>

          <div className="rounded-lg border bg-background p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-foreground">Ceased / Historical ({stats.historicalTotal})</h3>
              <Badge variant="outline" className="text-[10px]">
                1958–2019
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Major defunct carriers that shaped Nigerian commercial aviation — including former flag carriers{" "}
              <Link href="/airlines/nigeria-airways" className="font-semibold text-primary hover:underline">
                Nigeria Airways (WT)
              </Link>{" "}
              and{" "}
              <Link href="/airlines/air-nigeria" className="font-semibold text-primary hover:underline">
                Virgin Nigeria / Air Nigeria
              </Link>
              , plus private pioneers{" "}
              <Link href="/airlines/okada-air" className="font-semibold text-primary hover:underline">
                Okada Air
              </Link>
              ,{" "}
              <Link href="/airlines/bellview-airlines" className="font-semibold text-primary hover:underline">
                Bellview
              </Link>
              ,{" "}
              <Link href="/airlines/adc-airlines" className="font-semibold text-primary hover:underline">
                ADC
              </Link>
              ,{" "}
              <Link href="/airlines/chanchangi-airlines" className="font-semibold text-primary hover:underline">
                Chanchangi
              </Link>
              , and{" "}
              <Link href="/airlines/med-view-airline" className="font-semibold text-primary hover:underline">
                Med-View
              </Link>
              . Note that IATA recycles 2-character codes after closure.
            </p>
          </div>
        </div>
      </section>

      <section id="hub-airports" aria-labelledby="hubs-h" className="space-y-4 rounded-xl border bg-card/40 p-4 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 id="hubs-h" className="text-lg font-bold">
              Primary Nigerian hub airports &amp; aviation cross-links
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Every airline profile on NaijaCheck links directly to its verified Nigerian base airport(s) in our{" "}
              <Link href="/airports" className="font-semibold text-primary hover:underline">
                24-airport IATA / ICAO directory
              </Link>
              .
            </p>
          </div>
          <Link href="/airports" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
            Explore all 24 Nigerian airports →
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {majorHubs.map((ap) => (
            <Link
              key={ap.slug}
              href={`/airports/${ap.slug}`}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background p-3 transition-colors hover:border-primary/60"
            >
              <div>
                <p className="font-bold text-foreground">{ap.city}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{ap.name}</p>
              </div>
              <span className="shrink-0 rounded border bg-secondary/50 px-2 py-0.5 font-mono text-xs font-extrabold">
                {ap.iata} / {ap.icao}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="faq-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="faq-h" className="text-lg font-bold">
          Frequently asked questions — airlines in Nigeria
        </h2>
        <div className="space-y-3">
          {HUB_FAQS.map((f) => (
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
            Sources, scope &amp; verification ({updatedAt})
          </h2>
          <Badge variant="outline">Manual verification · ₦0 static archive</Badge>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{AIRLINES_FILE_SCOPE}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{AIRLINES_FILE_NOTES}</p>

        <ul className="space-y-2 pt-1">
          {hubSources.map((src) => (
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

        <div className="flex flex-wrap gap-2 pt-2 text-xs font-semibold">
          <Link
            href="/airports"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Nigerian airports (IATA / ICAO) →
          </Link>
          <Link
            href="/geo"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            All 774 LGAs by state →
          </Link>
          <Link
            href="/codes/postal"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            State &amp; district postal codes →
          </Link>
          <Link
            href="/howto/passport-renewal-2026"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Nigerian passport renewal guide →
          </Link>
        </div>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/airlines", "Airlines in Nigeria"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Airlines in Nigeria — Active, Suspended & Historical IATA / ICAO Directory",
            description: AIRLINES_FILE_SCOPE,
            url: absUrl("/airlines"),
            inLanguage: "en-NG",
            dateModified: updatedAt,
            isPartOf: {
              "@type": "WebSite",
              name: SITE_CONFIG.name,
              url: SITE_CONFIG.url,
            },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: airlines.length,
              itemListElement: airlines.map((a, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: `${a.name} (${airlineCodeSummary(a)}) — ${a.status}`,
                url: absUrl(`/airlines/${a.slug}`),
              })),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HUB_FAQS.map((f) => ({
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
