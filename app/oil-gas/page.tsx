import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { OperatorsSearch } from "@/components/oil-gas/operators-search";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import {
  OIL_GAS_FILE_NOTES,
  OIL_GAS_FILE_SCOPE,
  getAllOilGasOperators,
  getOilGasHubSources,
  getOilGasStats,
  oilGasUpdatedAt,
  operatorSegmentLabel,
  operatorTypeLabel,
} from "@/lib/oil-gas";

export const metadata: Metadata = pageMetadata({
  path: "/oil-gas",
  title: "Oil & Gas Companies in Nigeria — Major Upstream, LNG & Downstream Operators",
  description:
    "16 verified major oil and gas operators in Nigeria: NNPC Limited, 5 IOC groups (Shell SNEPCo, ExxonMobil Esso, Chevron, TotalEnergies, Eni NAE), Nigeria LNG, and 9 indigenous operators (Renaissance, Seplat, Oando, Aradel, Heirs Energies, FIRST E&P, Dangote Refinery, Ardova & Conoil).",
  keywords: [
    "oil companies in Nigeria",
    "oil and gas operators in Nigeria",
    "upstream oil companies in Nigeria",
    "IOCs in Nigeria",
    "indigenous oil companies in Nigeria",
    "NNPC Limited",
    "Renaissance Africa Energy SPDC",
    "Seplat Energy SEPNU",
    "NLNG Nigeria",
    "Dangote Refinery",
  ],
});

const HUB_FAQS: { q: string; a: string }[] = [
  {
    q: "Who regulates upstream vs downstream oil and gas companies in Nigeria?",
    a: "Under Nigeria's Petroleum Industry Act (PIA) 2021, upstream exploration and production leases are regulated by the Nigerian Upstream Petroleum Regulatory Commission (NUPRC), while natural gas processing, LNG, crude refining, coastal depots, and retail fuel stations are regulated by the Nigerian Midstream and Downstream Petroleum Regulatory Authority (NMDPRA). NNPC Limited operates separately as a commercial company rather than the industry regulator.",
  },
  {
    q: "Did Shell, ExxonMobil, and Eni leave Nigeria after their onshore divestments?",
    a: "No. Between August 2024 and March 2025, Eni sold onshore NAOC to Oando Plc, ExxonMobil sold shallow-water MPNU to Seplat Energy Plc (renamed SEPNU), and Shell sold onshore SPDC to Renaissance Africa Energy Company Limited. All three international groups remain active in Nigeria through deepwater assets (such as Bonga, Erha, Usan, and Abo) and/or shareholdings in Nigeria LNG Limited on Bonny Island.",
  },
  {
    q: "Does this directory list every filling station or oilfield contractor in Nigeria?",
    a: "No. NaijaCheck curates 16 verified major operators across Nigeria's national oil company, international oil company groups, Nigeria LNG, major indigenous upstream producers, Dangote Petroleum Refinery, and long-established major downstream marketers — each backed by primary corporate, regulatory, or Nigerian Exchange citations.",
  },
];

export default function OilGasIndexPage() {
  const operators = getAllOilGasOperators();
  const stats = getOilGasStats();
  const updatedAt = oilGasUpdatedAt();
  const hubSources = getOilGasHubSources();

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Major Oil & Gas Companies and Operators in Nigeria",
    description: OIL_GAS_FILE_SCOPE,
    url: absUrl("/oil-gas"),
    inLanguage: "en-NG",
    dateModified: updatedAt,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_CONFIG.name,
      url: SITE_CONFIG.url,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: operators.length,
      itemListElement: operators.map((op, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: op.name,
        url: absUrl(`/oil-gas/${op.slug}`),
        description: `${operatorTypeLabel(op.type)} · ${op.focusSummary ?? operatorSegmentLabel(op.segment)}${
          op.headquartersCity ? ` · HQ: ${op.headquartersCity}` : ""
        }`,
      })),
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HUB_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Oil & Gas Operators", href: "/oil-gas" },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {stats.total} verified major operators · checked {updatedAt}
          </Badge>
          <Badge variant="outline">
            {stats.noc} NOC · {stats.ioc} IOCs · {stats.jv} LNG JV · {stats.independent} Indigenous
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            Primary corporate, NUPRC, NMDPRA &amp; NGX citations
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Oil &amp; gas companies in Nigeria — major upstream, LNG, refining &amp; downstream operators
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Check who actually operates Nigeria’s major upstream blocks, deepwater FPSOs, Bonny Island LNG trains,
          refining landmarks, and nationwide fuel networks — updated for the post-divestment landscape (
          <strong>Renaissance / former SPDC</strong>, <strong>Seplat SEPNU / former MPNU</strong>, and{" "}
          <strong>Oando / former NAOC</strong>).{" "}
          <strong>Dataset scope:</strong> {stats.total} verified major operators ({stats.noc} national oil company,{" "}
          {stats.ioc} international oil company groups, {stats.jv} incorporated LNG joint venture, and{" "}
          {stats.independent} major indigenous upstream, refining, and downstream companies, manually verified{" "}
          {updatedAt}) — not an exhaustive list of every independent filling station, marginal-field contractor, or
          proposed modular refinery. NaijaCheck does not publish crude oil price feeds, licence-bidding tips, or equity
          investment advice.
        </p>

        <nav aria-label="On-page sections" className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
          <a
            href="#directory"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Filterable directory ({stats.total})
          </a>
          <a
            href="#divestments-regulators"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Divestments &amp; PIA regulators
          </a>
          <a
            href="#related"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Energy hubs, airports &amp; rates
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
          title="Oil & Gas Companies in Nigeria — Major Upstream, LNG & Downstream Operators"
          url={absUrl("/oil-gas")}
          summary={`${stats.total} verified major oil and gas operators in Nigeria (${stats.noc} NOC, ${stats.ioc} IOCs, ${stats.jv} LNG JV, ${stats.independent} indigenous) with primary corporate & regulatory sources (${updatedAt})`}
        />
      </header>

      <section id="directory" aria-labelledby="directory-h" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="directory-h" className="text-lg font-bold">
            Major oil &amp; gas operators in Nigeria — ownership type, value-chain focus &amp; HQ
          </h2>
          <span className="text-xs text-muted-foreground">
            Open any operator for legal name, key Nigerian assets, regulator scope &amp; cited filings
          </span>
        </div>
        <OperatorsSearch operators={operators} />
      </section>

      <section
        id="divestments-regulators"
        aria-labelledby="divestments-h"
        className="space-y-4 rounded-xl border bg-card/40 p-5"
      >
        <div className="space-y-1">
          <h2 id="divestments-h" className="text-lg font-bold">
            Why older “list of oil companies in Nigeria” pages are outdated: divestments &amp; PIA structure
          </h2>
          <p className="text-xs text-muted-foreground">
            Three completed onshore/shallow-water transfers and the Petroleum Industry Act (PIA) reshaped who operates
            which assets in Nigeria.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-3.5 text-xs leading-relaxed">
            <p className="font-bold text-foreground">SPDC → Renaissance Africa Energy</p>
            <p className="mt-1 text-muted-foreground">
              Completed 13 March 2025: Nigerian-led{" "}
              <Link href="/oil-gas/renaissance-africa-energy" className="font-semibold text-primary hover:underline">
                Renaissance Africa Energy
              </Link>{" "}
              acquired onshore SPDC (Bonny &amp; Forcados terminals).{" "}
              <Link href="/oil-gas/shell-nigeria" className="font-semibold text-primary hover:underline">
                Shell Nigeria
              </Link>{" "}
              retains deepwater Bonga (SNEPCo), Shell Nigeria Gas (SNG), and 25.6% of NLNG.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-3.5 text-xs leading-relaxed">
            <p className="font-bold text-foreground">MPNU → Seplat Energy (SEPNU)</p>
            <p className="mt-1 text-muted-foreground">
              Completed 12 December 2024:{" "}
              <Link href="/oil-gas/seplat-energy" className="font-semibold text-primary hover:underline">
                Seplat Energy Plc
              </Link>{" "}
              acquired shallow-water MPNU (Qua Iboe terminal &amp; OMLs 67, 68, 70, 104), renamed SEPNU.{" "}
              <Link href="/oil-gas/exxonmobil-nigeria" className="font-semibold text-primary hover:underline">
                ExxonMobil
              </Link>{" "}
              retains deepwater Erha, Usan, and 20% of Bonga via Esso E&amp;P.
            </p>
          </div>

          <div className="rounded-lg border bg-background p-3.5 text-xs leading-relaxed">
            <p className="font-bold text-foreground">NAOC → Oando Plc</p>
            <p className="mt-1 text-muted-foreground">
              Completed 22 August 2024:{" "}
              <Link href="/oil-gas/oando" className="font-semibold text-primary hover:underline">
                Oando Plc
              </Link>{" "}
              acquired onshore Nigerian Agip Oil Company (OMLs 60–63, Brass terminal &amp; Okpai power interest).{" "}
              <Link href="/oil-gas/eni-nigeria" className="font-semibold text-primary hover:underline">
                Eni
              </Link>{" "}
              retains deepwater NAE, AENR, and 10.4% of NLNG.
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{OIL_GAS_FILE_NOTES}</p>
      </section>

      <section id="faqs" aria-labelledby="faqs-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
        <h2 id="faqs-h" className="text-lg font-bold">
          Frequently asked questions
        </h2>
        <div className="divide-y rounded-lg border bg-background">
          {HUB_FAQS.map((f) => (
            <details key={f.q} className="group p-4 text-sm">
              <summary className="cursor-pointer list-none font-semibold text-foreground group-open:text-primary">
                {f.q}
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="related" aria-labelledby="related-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
        <h2 id="related-h" className="text-lg font-bold">
          Related energy corridors, oil-hub airports, states &amp; fuel/FX references
        </h2>
        <p className="text-xs text-muted-foreground">
          Cross-check commercial aviation gateways serving Niger Delta and Lagos headquarters, state LGA directories,
          and NaijaCheck’s stored fuel and FX trackers:
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-background p-3.5 text-xs">
            <p className="font-bold text-foreground">Oil-corridor commercial airports</p>
            <ul className="mt-2 space-y-1.5 text-muted-foreground">
              <li>
                <Link href="/airports/port-harcourt-international" className="text-primary hover:underline">
                  Port Harcourt International (PHC / DNPO)
                </Link>{" "}
                — Rivers &amp; Bonny corridor
              </li>
              <li>
                <Link href="/airports/warri-osubi" className="text-primary hover:underline">
                  Warri / Osubi Airport (QRW / DNSU)
                </Link>{" "}
                — western Niger Delta &amp; Escravos hub
              </li>
              <li>
                <Link href="/airports/uyo-victor-attah" className="text-primary hover:underline">
                  Victor Attah Int’l, Uyo (QUO / DNAI)
                </Link>{" "}
                — Akwa Ibom / Qua Iboe corridor
              </li>
              <li>
                <Link href="/airports/lagos-murtala-muhammed" className="text-primary hover:underline">
                  Murtala Muhammed Int’l, Lagos (LOS / DNMM)
                </Link>{" "}
                — VI, Ikoyi &amp; Lekki HQs
              </li>
              <li>
                <Link href="/airports/abuja-nnamdi-azikiwe" className="text-primary hover:underline">
                  Nnamdi Azikiwe Int’l, Abuja (ABV / DNAA)
                </Link>{" "}
                — NNPC Towers, NUPRC &amp; NMDPRA
              </li>
            </ul>
          </div>

          <div className="rounded-lg border bg-background p-3.5 text-xs">
            <p className="font-bold text-foreground">Key producing &amp; HQ states (LGAs)</p>
            <ul className="mt-2 space-y-1.5 text-muted-foreground">
              <li>
                <Link href="/geo/rivers" className="text-primary hover:underline">
                  Rivers State LGAs
                </Link>{" "}
                — Port Harcourt, Obio/Akpor, Bonny, Eleme &amp; Ahoada East
              </li>
              <li>
                <Link href="/geo/delta" className="text-primary hover:underline">
                  Delta State LGAs
                </Link>{" "}
                — Warri, Okpe (Osubi), Ughelli, Sapele &amp; Burutu (Forcados)
              </li>
              <li>
                <Link href="/geo/akwa-ibom" className="text-primary hover:underline">
                  Akwa Ibom State LGAs
                </Link>{" "}
                — Eket &amp; Ibeno (Qua Iboe terminal)
              </li>
              <li>
                <Link href="/geo/bayelsa" className="text-primary hover:underline">
                  Bayelsa State LGAs
                </Link>{" "}
                — Brass &amp; Yenagoa
              </li>
              <li>
                <Link href="/geo/lagos" className="text-primary hover:underline">
                  Lagos State LGAs
                </Link>{" "}
                &amp;{" "}
                <Link href="/geo/fct-abuja" className="text-primary hover:underline">
                  FCT Abuja Councils
                </Link>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border bg-background p-3.5 text-xs">
            <p className="font-bold text-foreground">Fuel &amp; FX context on NaijaCheck</p>
            <ul className="mt-2 space-y-1.5 text-muted-foreground">
              <li>
                <Link href="/prices/fuel" className="text-primary hover:underline">
                  Fuel &amp; depot price history (/prices/fuel)
                </Link>{" "}
                — stored Lagos petrol, diesel &amp; LPG readings
              </li>
              <li>
                <Link href="/rates" className="text-primary hover:underline">
                  USD/NGN official &amp; parallel rates (/rates)
                </Link>{" "}
                — FX reference shaping landed fuel &amp; equipment costs
              </li>
              <li>
                <Link href="/tools/generator" className="text-primary hover:underline">
                  Generator run-cost calculator
                </Link>{" "}
                — monthly petrol/diesel spend estimator
              </li>
              <li>
                <Link href="/codes/postal" className="text-primary hover:underline">
                  NIPOST 6-digit postal codes
                </Link>{" "}
                — verified Victoria Island, Ikoyi, Lekki, Abuja CBD &amp; PH codes
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="sources" aria-labelledby="sources-h" className="space-y-3 rounded-xl border bg-card/40 p-5 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sources-h" className="text-base font-bold text-foreground">
            Primary regulatory &amp; corporate sources
          </h2>
          <span className="text-muted-foreground">
            Manual verification · lastVerified {updatedAt}
          </span>
        </div>

        <p className="leading-relaxed text-muted-foreground">{OIL_GAS_FILE_SCOPE}</p>

        <ul className="space-y-1.5 text-muted-foreground">
          {hubSources.map((src) => (
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
      </section>

      <JsonLd data={[itemListSchema, breadcrumbSchema("/oil-gas", "Oil & Gas Operators"), faqSchema]} />
    </div>
  );
}
