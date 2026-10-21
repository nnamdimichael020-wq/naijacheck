import Link from "next/link";
import type { Metadata } from "next";
import GeoSearch from "@/components/geo/geo-search";
import { ShareControls } from "@/components/share-controls";
import { getAllLgaStates, LGAS_FILE_UPDATED_AT, LGAS_FILE_SOURCES, lgaCounts } from "@/lib/lgas";

export const metadata: Metadata = {
  title: "Nigeria 774 LGAs — complete Local Government Areas by state | NaijaCheck",
  description: "All 774 Local Government Areas (768 LGAs + 6 FCT Area Councils) with official names, grouped by state. Find your LGA, see headquarters when sourced, plus postal cross-links.",
  alternates: { canonical: "/geo" },
  openGraph: { title: "Nigeria 774 LGAs — by state", description: "Complete 774 LGAs (768+6) — browse by state, search any LGA, postal cross-links where available.", url: "/geo", type: "website" },
};

export default function GeoHub(){
  const states=getAllLgaStates();
  const counts=lgaCounts();
  const searchStates=states.map(s=>({slug:s.slug, name:s.name, count:s.count, lgaSlugs:s.lgas.map(l=>l.slug), lgaNames:s.lgas.map(l=>l.name)}));
  const jsonLd={
    "@context":"https://schema.org",
    "@type":"CollectionPage",
    name:"Nigeria Local Government Areas — 774 LGAs",
    url:"https://naijacheck.ng/geo",
    description:"774 LGAs (768 LGAs + 6 FCT Area Councils) — alphabetical by state from a citable open dataset plus NBS/gazette references.",
    isPartOf:{ "@type":"WebSite", name:"NaijaCheck", url:"https://naijacheck.ng"},
  };
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <nav className="text-xs text-muted-foreground"><Link href="/" className="hover:underline">Home</Link><span className="mx-1.5">/</span><span className="text-foreground">LGAs</span></nav>
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Nigeria Local Government Areas — 774 LGAs</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Every LGA in Nigeria in one place: <span className="font-medium text-foreground">774 entries — 768 LGAs + 6 FCT Area Councils</span>, grouped by the 36 states and the FCT. Use this hub to find your LGA&apos;s official name, its state parent, headquarters where independently verified, and best-effort postal-code cross-links. LCDAs (like Lagos&apos; 37) are subdivisions of LGAs and are not counted separately here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-3 py-1">{counts.states} states/FCT</span>
          <span className="rounded-full bg-muted px-3 py-1">{counts.lgas} LGAs</span>
          <span className="rounded-full border border-border px-3 py-1">Updated {LGAS_FILE_UPDATED_AT}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Search any LGA</h2>
        <GeoSearch states={searchStates} />
        <p className="text-xs text-muted-foreground">Matches LGA name or state — opens the LGA page. Try “Ikeja”, “Chikun”, “Gwarzo”, “Bwari”.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {states.map(s=>(
          <Link key={s.slug} href={`/geo/${s.slug}`} className="rounded-2xl border border-border bg-card p-4 hover:bg-muted/30 transition">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{s.name} State{s.slug==="fct-abuja" ? " — FCT" : ""}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.count} LGA{s.count!==1?"s":""}{" — "}{s.lgas.slice(0,3).map(l=>l.name).join(", ")}…</div>
              </div>
              <div className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{s.count}</div>
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">What is an LGA?</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          A Local Government Area is the third tier of government in Nigeria — after federal and state — created under the 1999 Constitution. Each LGA has an elected chairman, council and wards, and runs local services. The country has <span className="text-foreground font-medium">768 LGAs plus 6 Area Councils in the FCT = 774</span>. Lagos also operates 37 Local Council Development Areas (LCDAs) for administration, but only its 20 LGAs are counted in the official 774.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold">Sources & verification</h2>
        <p className="text-xs leading-5 text-muted-foreground">Names from gazette/NBS lists, cross-checked against an open 774-record dataset with Wikidata linkage. Headquarters only shown where independently verified; otherwise omitted (never guessed). For boundaries see GRID3; for population, only dated NBS/NPC figures would be shown — none included in this build.</p>
        <ul className="list-disc pl-5 text-sm marker:text-muted-foreground">
          {LGAS_FILE_SOURCES.map(s=> <li key={s.url}><a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="underline decoration-muted-foreground/30 underline-offset-4 hover:decoration-foreground">{s.label}</a></li>)}
        </ul>
        <div className="text-xs text-muted-foreground">Last verified: {LGAS_FILE_UPDATED_AT} (manual). <span className="font-medium">Zero invented headquarters or postal codes — fields omitted when unverified.</span></div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Cross-link help</h2>
        <p className="text-sm leading-6 text-muted-foreground">Postal codes: NIPOST assigns 6-digit codes per delivery area — not 1:1 with LGA boundaries. Each state/LGA page links the best-effort postal places in that state from <Link href="/codes/postal" className="underline">/codes/postal</Link>. NDAPS-ready codes rolling out from 1 Oct 2026 sit beside legacy NIPOST codes — use plus full street address for delivery.</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Link href="/codes/postal" className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Postal codes →</Link>
          <Link href="/codes/banks" className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Bank codes →</Link>
          <Link href="/rates" className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Rates →</Link>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <ShareControls title="Nigeria 774 LGAs — complete list" summary="All 774 LGAs (768+6) by state — find any LGA in Nigeria." />
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
    </div>
  );
}
