import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CopyButton } from "@/components/codes/copy-button";
import { ShareControls } from "@/components/share-controls";
import { getAllLgaParams, getLga, lgaIntroVariant } from "@/lib/lgas";
import { getPostalLeavesForState } from "@/lib/postal-geo";

export async function generateStaticParams(){
  return getAllLgaParams().map(p=>({state: p.state, lga: p.lga}));
}
export const dynamicParams=false;

export async function generateMetadata({params}:{params: Promise<{state:string; lga:string}>}):Promise<Metadata>{
  const {state: st, lga: ls}=await params;
  const hit=getLga(st,ls);
  if(!hit) return {};
  const {state, lga}=hit;
  // Unique title/meta per LGA — includes state+LGA to avoid anti-spam duplicate
  const title=`${lga.name} LGA (${state.name}) — HQ, postal links | NaijaCheck`;
  const hqPart=lga.headquarters ? ` Headquarters: ${lga.headquarters}.` : ` Headquarters not independently verified — omitted (never guessed).`;
  const desc=`${lga.name} is an LGA in ${state.name} State (${state.count} LGAs in the state).${hqPart} Postal cross-links where available, sources, and parent state link.`;
  return {
    title,
    description: desc,
    alternates:{ canonical:`/geo/${state.slug}/${lga.slug}`},
    openGraph:{ title: `${lga.name} LGA — ${state.name}`, description: desc, url:`/geo/${state.slug}/${lga.slug}`, type:"article"},
  };
}

export default async function LgaPage({params}:{params: Promise<{state:string; lga:string}>}){
  const {state: st, lga: ls}=await params;
  const hit=getLga(st,ls);
  if(!hit) notFound();
  const {state, lga}=hit;
  const postal=getPostalLeavesForState(state.slug);
  const intro=lgaIntroVariant(lga,state, postal.length);
  const siblings=state.lgas;
  const idx=siblings.findIndex(x=>x.slug===lga.slug);
  const prev=idx>0 ? siblings[idx-1] : null;
  const next=idx < siblings.length-1 ? siblings[idx+1] : null;

  // FAQ only when true
  const faqs: {q:string; a:string}[]=[
    {q:`What state is ${lga.name} LGA in?`, a:`${lga.name} LGA is in ${state.name} State, one of ${state.count} LGAs in the state and part of Nigeria's 774 LGAs (768 LGAs + 6 FCT Area Councils).`},
    ...(lga.headquarters ? [{q:`Where is the headquarters of ${lga.name} LGA?`, a:`The headquarters of ${lga.name} LGA is ${lga.headquarters} (council headquarters where local administration is based).`} ]: []),
    {q:`How many LGAs are in ${state.name} State?`, a:`There are ${state.count} LGAs in ${state.name} State.`},
    {q:`What is the postal code for ${lga.name} LGA?`, a: postal.length>0 ? `NIPOST assigns 6-digit codes per delivery area, not per LGA. The closest verified places in ${state.name} are listed below — use the one nearest your street plus full address. NDAPS rollout from 1 Oct 2026 adds a 5-digit complement; we keep legacy codes alongside until adoption is clear.` : `No single postal code covers a whole LGA. Use ${state.name} head-office code via /codes/postal/${state.slug} plus street address for forms.`},
  ];

  const jsonLdWebPage={
    "@context":"https://schema.org",
    "@type":"WebPage",
    name:`${lga.name} LGA (${state.name})`,
    description: intro,
    url:`https://naijacheck.ng/geo/${state.slug}/${lga.slug}`,
    isPartOf:{ "@type":"WebSite", name:"NaijaCheck", url:"https://naijacheck.ng"},
    about:{ "@type":"AdministrativeArea", name: `${lga.name} LGA`, containedInPlace:{ "@type":"AdministrativeArea", name: state.name }},
    dateModified: `${state.lastVerified}T00:00:00+01:00`,
  };
  const jsonLdFaq={
    "@context":"https://schema.org",
    "@type":"FAQPage",
    mainEntity: faqs.map(f=>({ "@type":"Question", name:f.q, acceptedAnswer:{ "@type":"Answer", text:f.a}})),
  };
  const jsonLdBreadcrumb={
    "@context":"https://schema.org",
    "@type":"BreadcrumbList",
    itemListElement:[
      {"@type":"ListItem","position":1,"name":"Home","item":"https://naijacheck.ng/"},
      {"@type":"ListItem","position":2,"name":"LGAs","item":"https://naijacheck.ng/geo"},
      {"@type":"ListItem","position":3,"name":state.name,"item":`https://naijacheck.ng/geo/${state.slug}`},
      {"@type":"ListItem","position":4,"name":lga.name,"item":`https://naijacheck.ng/geo/${state.slug}/${lga.slug}`},
    ]
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">Home</Link><span className="mx-1.5">/</span>
        <Link href="/geo" className="hover:underline">LGAs</Link><span className="mx-1.5">/</span>
        <Link href={`/geo/${state.slug}`} className="hover:underline">{state.name}</Link><span className="mx-1.5">/</span>
        <span className="text-foreground">{lga.name}</span>
      </nav>

      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{lga.name} LGA <span className="text-muted-foreground font-normal">({state.name} State)</span></h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{intro} Part of Nigeria&apos;s 774 LGAs. <Link href={`/geo/${state.slug}`} className="underline decoration-muted-foreground/30 underline-offset-4 hover:decoration-foreground">See all {state.count} LGAs in {state.name} →</Link></p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-muted px-3 py-1">{state.name} · {state.count} LGAs</span>
          <span className="rounded-full border border-border px-3 py-1">Last verified {state.lastVerified}</span>
          {!lga.headquarters && <span className="rounded-full border border-dashed border-border px-3 py-1">HQ not verified — omitted</span>}
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">At a glance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">State</div><div className="font-medium"><Link href={`/geo/${state.slug}`} className="underline">{state.name}</Link></div></div>
          <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">LGA count in state</div><div className="font-medium">{state.count}</div></div>
          <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Official name</div><div className="font-medium">{lga.name}</div></div>
          <div className="rounded-xl bg-muted p-3"><div className="text-xs text-muted-foreground">Headquarters</div><div className="font-medium">{lga.headquarters ?? "Not verified"}</div></div>
        </div>
        {lga.headquarters && <div className="text-xs text-muted-foreground">Council secretariat at {lga.headquarters}. (Shown only when sourced — never guessed.)</div>}
        <div className="flex flex-wrap gap-2">
          <CopyButton text={`${lga.name} LGA, ${state.name} State`} label={`Copy “${lga.name} LGA”`} />
          <CopyButton text={state.name} label={`Copy “${state.name}”`} />
          {lga.headquarters && <CopyButton text={lga.headquarters} label={`Copy HQ “${lga.headquarters}”`} />}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Postal links — {state.name}</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          NIPOST assigns 6-digit codes to delivery districts/towns, not to LGAs as a whole. These are the verified places in {state.name} we link to from the postal archive — pick the nearest place to your address. Always use full street + town on forms.
        </p>
        {postal.length>0 ? (
          <div className="flex flex-wrap gap-2">
            {postal.map(p=> p.href ? (
              <Link key={`${p.slug}-${p.code}`} href={p.href} className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted">{p.place} {p.code} <span className="text-muted-foreground">↗</span></Link>
            ) : (
              <span key={`${p.slug}-${p.code}`} className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground">{p.place} {p.code}</span>
            ))}
          </div>
        ):(
          <div className="text-sm text-muted-foreground">No district postal places verified for {state.name} yet — see <Link href={`/codes/postal/${state.slug}`} className="underline">/codes/postal/{state.slug}</Link>.</div>
        )}
        <div className="text-xs"><Link href={`/codes/postal/${state.slug}`} className="underline">All postal places in {state.name} →</Link> <span className="text-muted-foreground">· NDAPS 1 Oct 2026 in effect — complementary 5-digit layer alongside NIPOST.</span></div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h2 className="text-sm font-semibold">More in {state.name}</h2>
        <div className="flex flex-wrap gap-2">
          {siblings.slice(0, 18).map(s=> (
            <Link key={s.slug} href={`/geo/${state.slug}/${s.slug}`} className={`rounded-full border px-2.5 py-1 text-xs ${s.slug===lga.slug ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}>{s.name}</Link>
          ))}
          {siblings.length>18 && <span className="px-2 py-1 text-xs text-muted-foreground">+ {siblings.length-18} more</span>}
        </div>
        {(prev||next) && (
          <div className="flex gap-2 pt-1">
            {prev && <Link href={`/geo/${state.slug}/${prev.slug}`} className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted">← {prev.name}</Link>}
            {next && <Link href={`/geo/${state.slug}/${next.slug}`} className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted">{next.name} →</Link>}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Frequently asked</h2>
        <dl className="space-y-2">
          {faqs.map(f=>(
            <div key={f.q} className="rounded-xl bg-muted px-3 py-2.5">
              <dt className="text-sm font-medium">{f.q}</dt>
              <dd className="mt-1 text-sm leading-6 text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <ShareControls title={`${lga.name} LGA (${state.name}) — HQ & postal links`} summary={`Official page for ${lga.name} LGA in ${state.name} State.`} />
        </div>
        <div className="text-xs text-muted-foreground">Last verified: {state.lastVerified} (manual). Population and coordinates omitted — no dated NBS/NPC source in this build. Headquarters omitted when not independently verified.</div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold">Sources</h3>
        <ul className="list-disc pl-5 text-sm marker:text-muted-foreground space-y-1">
          {lga.sources.map(s=> <li key={s.url}><a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="underline decoration-muted-foreground/30 underline-offset-4 hover:decoration-foreground">{s.label}</a></li>)}
          <li>Parent state list: <Link href={`/geo/${state.slug}`} className="underline">{state.name} — {state.count} LGAs</Link> · Hub: <Link href="/geo" className="underline">/geo — 774 LGAs</Link></li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/codes/postal/${state.slug}`} className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted">Postal codes — {state.name} →</Link>
          <Link href="/codes/banks" className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted">Bank codes →</Link>
          <Link href="/rates" className="text-xs rounded-full border border-border px-3 py-1.5 hover:bg-muted">Rates →</Link>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLdWebPage)}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLdFaq)}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLdBreadcrumb)}} />
    </div>
  );
}
