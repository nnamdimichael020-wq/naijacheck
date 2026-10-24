import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { PortsSearch } from "@/components/ports/ports-search";
import { SITE_CONFIG } from "@/config/site";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import {
  formatUnLocodeSpaced,
  getAllPorts,
  getCoastalPortStates,
  getPortsStats,
  PORTS_HUB_SOURCES,
  PORTS_NOTES,
  PORTS_PREFIX_CHOICE,
  PORTS_SCOPE,
} from "@/lib/ports";

export const metadata: Metadata = pageMetadata({
  path: "/ports",
  title: "Seaports in Nigeria — Major NPA Ports, Deep-Sea & Marine Terminals Directory",
  description:
    "Verified reference to 12 major operational seaports and maritime export terminals in Nigeria: Apapa (NGAPP), Tin Can Island (NGTIN), Lekki Deep Sea Port (NGLKK), Onne (NGONN), Port Harcourt (NGPHC), Warri/Delta (NGWAR), Calabar (NGCBQ), Bonny (NGBON), Qua Iboe (NGOBO), Forcados (NGFOR), Escravos (NGESC), and Brass (NGBRA) — with UN/LOCODEs, terminal operators, and NPA/UNECE sources.",
  keywords: [
    "seaports in Nigeria",
    "ports in Nigeria",
    "major ports in Nigeria",
    "list of seaports in Nigeria and their locations",
    "Nigerian Ports Authority ports",
    "Nigeria UN/LOCODE port codes",
    "Apapa Port code NGAPP",
    "Tin Can Island Port NGTIN",
    "Lekki Deep Sea Port NGLKK",
    "Onne Port NGONN",
  ],
});

const HUB_FAQS = [
  {
    q: "How many major commercial seaports are operated under the Nigerian Ports Authority (NPA)?",
    a: "The Nigerian Ports Authority (NPA) lists 7 major operational commercial seaport complexes across two maritime zones: Western Ports in Lagos State — Lagos Port Complex Apapa (NGAPP), Tin Can Island Port Complex (NGTIN), and Lekki Deep Sea Port (NGLKK) — and Eastern Ports across the Niger Delta and Cross River — Onne Port Complex (NGONN) and Rivers Port Complex Port Harcourt (NGPHC) in Rivers State, Delta Ports Complex Warri/Koko/Sapele/Burutu (NGWAR) in Delta State, and Calabar Port Complex (NGCBQ) in Cross River State.",
  },
  {
    q: "Which port is Nigeria's deepest seaport?",
    a: "Lekki Deep Sea Port (UN/LOCODE: NGLKK) in Ibeju-Lekki LGA, Lagos State is Nigeria's first operational deep-sea port. Developed under a 45-year BOOT public-private partnership among LPLEL private sponsors (75%), the Lagos State Government (20%), and NPA (5%), it features a 16.5-metre channel draft capable of berthing Super Post-Panamax mainline container vessels.",
  },
  {
    q: "How does Nigeria's landlord port model work?",
    a: "Following the federal port reform of 2006, the Federal Government via the Nigerian Ports Authority (NPA) owns port land, quays, breakwaters, and common-user navigation channels while providing statutory pilotage, towage, harbour control, and ISPS security. Private terminal concessionaires (such as APM Terminals Apapa, WACT Onne, TICT, PTML, ENL Consortium, INTELS, BUA Ports, PTOL, and ECM Terminals) lease berths and operate cargo-handling equipment.",
  },
  {
    q: "Why does NaijaCheck list Bonny, Qua Iboe, Forcados, Escravos, and Brass alongside NPA commercial seaports?",
    a: "While general merchandise and containers move through the 7 NPA commercial and deep-sea complexes, Nigeria's largest maritime export tonnage moves through dedicated coastal hydrocarbon and LNG terminals — Bonny (NGBON), Qua Iboe (NGOBO), Forcados (NGFOR), Escravos (NGESC), and Brass (NGBRA). Each holds an official UNECE Function-1 seaport UN/LOCODE and operates within NPA pilotage districts under NUPRC and NMDPRA regulatory oversight.",
  },
  {
    q: "Why are Ibom Deep Sea Port, Badagry Deep Sea Port, and Ondo Deep Sea Port not listed as active ports?",
    a: "NaijaCheck lists only operational seaports and active maritime export terminals. Greenfield port projects such as Ibom Deep Sea Port (Akwa Ibom), Badagry Deep Sea Port (Lagos), Ondo Multi-Purpose Deep Sea Port (Ilaje, Ondo), and Bakassi Deep Sea Port (Cross River) remain at planning, financing, or pre-commissioning stages rather than handling commercial shipping as of lastVerified.",
  },
  {
    q: "Does NaijaCheck provide real-time vessel tracking, freight quotes, or customs clearing?",
    a: "No. NaijaCheck is an independent static public reference. We do not display real-time AIS ship positions, freight rates, terminal storage quotes, or customs clearing services. Always verify vessel berthing windows and port dues directly with the Nigerian Ports Authority and the relevant terminal operator.",
  },
];

export default function PortsHubPage() {
  const ports = getAllPorts();
  const stats = getPortsStats();
  const coastalStates = getCoastalPortStates();

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Major Seaports & Marine Terminals in Nigeria",
    description:
      "Cited static directory of Nigeria's 7 major Nigerian Ports Authority (NPA) commercial and deep-sea port complexes plus 5 major hydrocarbon and LNG marine export terminals, with verified UNECE UN/LOCODEs and terminal operators.",
    url: absUrl("/ports"),
    inLanguage: "en-NG",
    dateModified: stats.latestVerified,
    isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: ports.length,
      itemListElement: ports.map((port, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: `${port.name}${port.unLocode ? ` (${port.unLocode})` : ""}`,
        url: absUrl(`/ports/${port.slug}`),
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
          { label: "Seaports in Nigeria", href: "/ports" },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {stats.total} major ports &amp; marine terminals · verified {stats.latestVerified}
          </Badge>
          <Badge variant="outline">
            {stats.commercialComplexes} NPA commercial &amp; deep-sea · {stats.energyTerminals} energy export
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            {stats.withUnLocode}/{stats.total} verified UN/LOCODEs · {stats.statesCovered} coastal states
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          Seaports in Nigeria — major NPA port complexes, deep-sea &amp; marine terminals
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Answer-first static reference to Nigeria’s <strong>{stats.commercialComplexes}</strong> major public
          commercial and deep-sea seaport complexes governed by the{" "}
          <strong>Nigerian Ports Authority (NPA)</strong> alongside{" "}
          <strong>{stats.energyTerminals}</strong> major crude oil, gas-to-liquids, and LNG marine export terminals
          carrying official <strong>UNECE UN/LOCODEs</strong>. Copy port codes in one tap, inspect concessioned
          terminal operators, and jump directly to coastal state LGAs, serving commercial airports, and energy
          operators.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-muted-foreground">
            <a href="#sources" className="font-semibold text-primary underline-offset-2 hover:underline">
              Primary sources (NPA, UNECE UN/LOCODE, LPLEL &amp; NUPRC/NMDPRA) ↓
            </a>{" "}
            · Verification: manual · lastVerified{" "}
            <strong className="text-foreground">{stats.latestVerified}</strong>
          </p>
        </div>

        <ShareControls
          title="Seaports in Nigeria — Major NPA Ports & UN/LOCODE Reference"
          url={absUrl("/ports")}
          summary={`${stats.total} verified Nigerian seaports & marine export terminals (${stats.commercialComplexes} NPA commercial/deep-sea complexes + ${stats.energyTerminals} crude/LNG terminals) with UN/LOCODEs and terminal concessionaires (${stats.latestVerified})`}
        />
      </header>

      {/* Honest scope & landlord-model card */}
      <section aria-labelledby="ports-scope-h" className="rounded-xl border bg-card/50 p-4 text-xs sm:p-5">
        <h2 id="ports-scope-h" className="text-sm font-bold text-foreground">
          Scope, NPA landlord model &amp; what this archive does not claim
        </h2>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">{PORTS_SCOPE}</p>
        <p className="mt-2 leading-relaxed text-muted-foreground">{PORTS_NOTES}</p>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Static reference honesty:</strong> NaijaCheck does not display AIS
          vessel tracking, ship arrival timetables, ocean freight quotes, customs duty calculators, or cargo booking.
        </p>
      </section>

      {/* Filterable table */}
      <section aria-labelledby="ports-directory-h" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ports-directory-h" className="text-xl font-bold">
            Filterable directory of major Nigerian seaports &amp; marine terminals
          </h2>
          <span className="text-xs text-muted-foreground">
            {stats.westernPorts} Western Ports · {stats.easternPorts} Eastern Ports &amp; Niger Delta terminals
          </span>
        </div>

        <PortsSearch ports={ports} />
      </section>

      {/* Coastal states cluster (/geo) */}
      <section aria-labelledby="coastal-states-h" className="space-y-4 rounded-xl border bg-card/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="coastal-states-h" className="text-lg font-bold">
            Nigerian seaports by coastal state (/geo cluster)
          </h2>
          <Link href="/geo" className="text-xs font-semibold text-primary hover:underline">
            All 36 states + FCT (774 LGAs) →
          </Link>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Operational major commercial ports and UNECE Function-1 export terminals span{" "}
          <strong>{coastalStates.length} coastal states</strong> along the Bight of Benin and Bight of Bonny. Two
          additional Atlantic-littoral states —{" "}
          <Link href="/geo/ondo" className="font-medium text-primary hover:underline">
            Ondo State
          </Link>{" "}
          (Ilaje coastline, site of a proposed deep-sea port) and{" "}
          <Link href="/geo/ogun" className="font-medium text-primary hover:underline">
            Ogun State
          </Link>{" "}
          (Ogun Waterside) — do not yet host an operational federal commercial seaport as of {stats.latestVerified}.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coastalStates.map((st) => (
            <div key={st.stateSlug} className="rounded-lg border bg-background p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/geo/${st.stateSlug}`}
                  className="text-sm font-bold text-foreground hover:text-primary hover:underline"
                >
                  {st.stateName} State
                </Link>
                <Badge variant="outline">
                  {st.count} {st.count === 1 ? "port" : "ports"}
                </Badge>
              </div>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                {st.ports.map((p) => {
                  const spaced = formatUnLocodeSpaced(p.unLocode);
                  return (
                    <li key={p.slug}>
                      <Link href={`/ports/${p.slug}`} className="font-medium text-primary hover:underline">
                        {p.name}
                      </Link>
                      {p.unLocode ? (
                        <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                          ({p.unLocode}
                          {spaced ? ` / ${spaced}` : ""})
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2.5 flex flex-wrap gap-3 border-t pt-2 text-[11px]">
                <Link href={`/geo/${st.stateSlug}`} className="font-semibold text-primary hover:underline">
                  {st.stateName} LGAs →
                </Link>
                <Link href={`/codes/postal/${st.stateSlug}`} className="font-semibold text-primary hover:underline">
                  {st.stateName} postal codes →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Aviation & Oil/Gas cross-cluster */}
      <section aria-labelledby="maritime-cluster-h" className="space-y-4 rounded-xl border bg-card/40 p-5">
        <h2 id="maritime-cluster-h" className="text-lg font-bold">
          Related maritime, aviation &amp; energy references on NaijaCheck
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-background p-4 text-xs">
            <p className="font-bold text-foreground">Coastal air-cargo &amp; crew gateways (/airports)</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Commercial airports serving Nigeria’s Western and Eastern Pilotage Districts:
            </p>
            <ul className="mt-2.5 space-y-1.5 text-muted-foreground">
              <li>
                •{" "}
                <Link href="/airports/lagos-murtala-muhammed" className="font-medium text-primary hover:underline">
                  Murtala Muhammed International Airport (LOS / DNMM)
                </Link>{" "}
                — Apapa, Tin Can Island &amp; Lekki corridor
              </li>
              <li>
                •{" "}
                <Link
                  href="/airports/port-harcourt-international"
                  className="font-medium text-primary hover:underline"
                >
                  Port Harcourt International Airport (PHC / DNPO)
                </Link>{" "}
                — Onne, Rivers Port, Bonny &amp; Brass corridor
              </li>
              <li>
                •{" "}
                <Link href="/airports/warri-osubi" className="font-medium text-primary hover:underline">
                  Warri / Osubi Airport (QRW / DNSU)
                </Link>{" "}
                — Warri, Koko, Escravos &amp; Forcados corridor
              </li>
              <li>
                •{" "}
                <Link href="/airports/calabar-margaret-ekpo" className="font-medium text-primary hover:underline">
                  Margaret Ekpo International Airport (CBQ / DNCA)
                </Link>{" "}
                &amp;{" "}
                <Link href="/airports/uyo-victor-attah" className="font-medium text-primary hover:underline">
                  Victor Attah Int’l (QUO)
                </Link>{" "}
                — Calabar &amp; Qua Iboe corridor
              </li>
            </ul>
            <div className="mt-3 pt-1">
              <Link href="/airports" className="font-semibold text-primary hover:underline">
                Browse all 24 Nigerian airports →
              </Link>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4 text-xs">
            <p className="font-bold text-foreground">Energy terminals, coastal tank farms &amp; LNG (/oil-gas)</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Operators linked directly to Nigeria’s export terminals, Free Zones, and coastal storage jetties:
            </p>
            <ul className="mt-2.5 space-y-1.5 text-muted-foreground">
              <li>
                •{" "}
                <Link href="/oil-gas/nigeria-lng" className="font-medium text-primary hover:underline">
                  Nigeria LNG Limited (NLNG)
                </Link>{" "}
                &amp;{" "}
                <Link
                  href="/oil-gas/renaissance-africa-energy"
                  className="font-medium text-primary hover:underline"
                >
                  Renaissance Africa Energy
                </Link>{" "}
                — Bonny &amp; Forcados export terminals
              </li>
              <li>
                •{" "}
                <Link href="/oil-gas/seplat-energy" className="font-medium text-primary hover:underline">
                  Seplat Energy (SEPNU)
                </Link>{" "}
                — Qua Iboe Terminal (QIT, Ibeno)
              </li>
              <li>
                •{" "}
                <Link href="/oil-gas/chevron-nigeria" className="font-medium text-primary hover:underline">
                  Chevron Nigeria Limited
                </Link>{" "}
                &amp;{" "}
                <Link href="/oil-gas/oando" className="font-medium text-primary hover:underline">
                  Oando Plc
                </Link>{" "}
                — Escravos &amp; Brass export terminals
              </li>
              <li>
                •{" "}
                <Link href="/oil-gas/dangote-refinery" className="font-medium text-primary hover:underline">
                  Dangote Petroleum Refinery
                </Link>{" "}
                (Ibeju-Lekki) &amp;{" "}
                <Link href="/prices/fuel" className="font-medium text-primary hover:underline">
                  Lagos depot fuel history (/prices/fuel)
                </Link>
              </li>
            </ul>
            <div className="mt-3 pt-1">
              <Link href="/oil-gas" className="font-semibold text-primary hover:underline">
                Browse all 16 oil &amp; gas operators →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Truthful FAQs */}
      <section aria-labelledby="ports-faq-h" className="space-y-3 rounded-xl border bg-card/40 p-5">
        <h2 id="ports-faq-h" className="text-lg font-bold">
          Frequently asked questions about Nigerian seaports
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

      {/* Primary sources & URL architecture note */}
      <section id="sources" aria-labelledby="ports-sources-h" className="space-y-3 rounded-xl border bg-card/40 p-5 text-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ports-sources-h" className="text-base font-bold text-foreground">
            Primary maritime &amp; regulatory sources
          </h2>
          <span className="text-muted-foreground">
            Verification: manual · lastVerified {stats.latestVerified}
          </span>
        </div>

        <ul className="space-y-1.5 text-muted-foreground">
          {PORTS_HUB_SOURCES.map((src) => (
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

        {PORTS_PREFIX_CHOICE ? (
          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
            <strong>URL architecture note:</strong> {PORTS_PREFIX_CHOICE}
          </p>
        ) : null}
      </section>

      <JsonLd data={[collectionSchema, breadcrumbSchema("/ports", "Seaports in Nigeria"), faqSchema]} />
    </div>
  );
}
