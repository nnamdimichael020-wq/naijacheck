import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ShareControls } from "@/components/share-controls";
import LgaTableFilter from "@/components/geo/lga-table-filter";
import { getAllLgaStates, getLgaState, LGAS_FILE_SOURCES } from "@/lib/lgas";
import { getPostalLeavesForState } from "@/lib/postal-geo";

export async function generateStaticParams(){
  return getAllLgaStates().map(s=>({state: s.slug}));
}
export const dynamicParams=false;

export async function generateMetadata({params}:{params:Promise<{state:string}>}):Promise<Metadata>{
  const {state:slug}=await params;
  const s=getLgaState(slug);
  if(!s) return {};
  return {
    title:`${s.name} State LGAs — ${s.count} Local Government Areas | NaijaCheck`,
    description:`All ${s.count} LGAs in ${s.name} State — official names, headquarters when verified, with postal cross-links.`,
    alternates:{ canonical:`/geo/${s.slug}`},
    openGraph:{ title:`${s.name} LGAs — ${s.count} LGAs`, description:`Official list of ${s.count} LGAs in ${s.name} State.`, url:`/geo/${s.slug}`, type:"website"},
  };
}

export default async function StatePage({params}:{params:Promise<{state:string}>}){
  const {state:slug}=await params;
  const state=getLgaState(slug);
  if(!state) notFound();
  const postal=getPostalLeavesForState(slug);
  const jsonLd={
    "@context":"https://schema.org",
    "@type":"CollectionPage",
    name:`${state.name} State — Local Government Areas (${state.count})`,
    url:`https://naijacheck.ng/geo/${state.slug}`,
    isPartOf:{ "@type":"WebSite", name:"NaijaCheck", url:"https://naijacheck.ng"},
    about:{ "@type":"AdministrativeArea", name:`${state.name} State`, containsPlace: state.lgas.map(l=>({ "@type":"AdministrativeArea", name: l.name }))},
  };
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <nav className="text-xs text-muted-foreground"><Link href="/" className="hover:underline">Home</Link><span className="mx-1.5">/</span><Link href="/geo" className="hover:underline">LGAs</Link><span className="mx-1.5">/</span><span className="text-foreground">{state.name}</span></nav>

      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{state.name} State — Local Government Areas ({state.count})</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Official list of the {state.count} Local Government Area{state.count!==1?"s":""} in {state.name} State. {state.lgas[0].name} to {state.lgas[state.lgas.length-1].name} — headquarters shown only where independently verified (never guessed). {slug==="lagos" ? " Lagos runs 37 LCDAs on top of its 20 LGAs for administration — they are not counted in the national 774." : ""} {slug==="fct-abuja" ? " The FCT has 6 Area Councils listed here as LGAs for parity (Bwari, Gwagwalada, Kuje, Kwali, Municipal and one other)." : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-3 py-1">{state.count} LGAs</span>
          <span className="rounded-full border border-border px-3 py-1">Last verified {state.lastVerified}</span>
          <Link href="/geo" className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">← All 774 LGAs</Link>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">LGAs in {state.name}</h2>
        <LgaTableFilter stateSlug={state.slug} lgas={state.lgas.map(l=>({slug:l.slug, name:l.name, headquarters:l.headquarters}))} />
      </section>

      {postal.length>0 && (
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Postal cross-links — {state.name}</h2>
          <p className="text-xs leading-5 text-muted-foreground">Best-effort links from the postal archive — LGA boundaries don&apos;t map 1:1 to NIPOST delivery areas, so use nearest place + full address. Only districts with a leaf page are linked; others show via the state hub.</p>
          <div className="flex flex-wrap gap-2">
            {postal.slice(0,24).map(p=> p.href ? (
              <Link key={`${p.slug}-${p.code}`} href={p.href} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">{p.place} {p.code}<span className="text-muted-foreground"> ↗</span></Link>
            ) : (
              <span key={`${p.slug}-${p.code}`} className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">{p.place} {p.code} (via hub)</span>
            ))}
          </div>
          <div><Link href={`/codes/postal/${slug}`} className="text-xs underline">All postal places in {state.name} →</Link></div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">About this list</h3>
        <p className="text-xs leading-5 text-muted-foreground">{state.notes}</p>
        <div className="text-xs text-muted-foreground">Last verified: {state.lastVerified} (manual). No population or invented HQ shown.</div>
        <ul className="list-disc pl-5 text-xs marker:text-muted-foreground">
          {LGAS_FILE_SOURCES.slice(0,3).map(s=> <li key={s.url}><a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="underline">{s.label}</a></li>)}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <ShareControls title={`${state.name} LGAs — ${state.count} Local Government Areas`} summary={`All ${state.count} LGAs in ${state.name} State — official names.`} />
        <Link href="/geo" className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted">← All states</Link>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
    </div>
  );
}
