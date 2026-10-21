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
import { getAllPostalAreaParams, getPostalPlace } from "@/lib/postal";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllPostalAreaParams().map(({ state, area }) => ({ state, area }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string; area: string }> }): Promise<Metadata> {
  const { state, area } = await params;
  const hit = getPostalPlace(state, area);
  if (!hit) return { title: "Not found" };
  const { state: s, place: p } = hit;
  const title = `${p.name.split("—")[0].trim()} postal code — ${s.name} (${p.code}) | NaijaCheck`;
  const description = `${p.name.split("—")[0].trim()} in ${s.name} State — NIPOST 6-digit postal code ${p.code} (${p.label ?? s.capital + " district"}). Full street context, neighbour codes, copy button, sources, verified ${s.lastVerified}.`;
  return pageMetadata({
    path: `/codes/postal/${s.slug}/${p.slug}`,
    title,
    description,
    keywords: [
      `${p.name.split("—")[0].trim()} postal code`,
      `${p.name.split("—")[0].trim()} ZIP code`,
      `${s.name} ${p.name.split("—")[0].trim()} postal code ${p.code}`,
      `${p.code} postal code Nigeria`,
    ],
  });
}

function areaExtras(stateSlug: string, areaSlug: string): { intro: string; bullets: string[]; faqExtra: { q: string; a: string } } | null {
  // unique body per high-intent leaf — no swapped template spam
  const map: Record<string, { intro: string; bullets: string[]; faqExtra: { q: string; a: string } }> = {
    "lagos:ikeja": {
      intro: "Ikeja is Lagos capital and airport district — Murtala Muhammed Airport, Computer Village and Alausa secretariat all sit on 100271/100211 blocks. Using 100001 (GPO) for a Lekki courier delays sorting to the wrong dispatch.",
      bullets: ["100001 = Ikeja GPO only (postboxes, government mail)", "100271 = Ikeja GRA/Maryland — most residential/commercial addresses", "100281 = Opebi/Allen — business strip off Obafemi Awolowo Way"],
      faqExtra: { q: "Is Ikeja 100001 or 100271?", a: "100001 is the Ikeja GPO/head office (001). The district where most homes/shops sit is 100271. Use 100271 for residential streets; 100001 only if your box is at the GPO." },
    },
    "lagos:victoria-island": {
      intro: "Victoria Island (VI) is finance/embassy island — Ajose Adeogun, Ahmadu Bello Way and Eko Hotel all route via 101241. Neighbouring Ikoyi 101233 is one digit off — wrong island = days lost at Lagos dispatch.",
      bullets: ["101241 = VI / Oniru / Akin Adesola — bank/embassy row", "101233 = Ikoyi — separate island delivery, don’t mix", "101232 = Obalende — market edge of VI"],
      faqExtra: { q: "VI vs Lekki — why different?", a: "VI is 101241 (Lagos Island dispatch 101). Lekki is 105102 (Eti-Osa/Ibeju split, dispatch 105). Different last-three = different lorry out of Ikeja sorting." },
    },
    "lagos:lekki": {
      intro: "Lekki Phase 1 is estate-planned — Admiralty Way, Ikate and Chevron all use 105102; wider Lekki/Ajah 105101 covers Akodo/Eleko. Phase 1 vs plain Lekki is one digit — ecommerce couriers enforce it.",
      bullets: ["105102 = Lekki Phase 1 (gated estates, Lekki Toll)", "105101 = Lekki-Ajah corridor (Sangotedo via Ibeju-Lekki)", "101245 = Ajah (older directories) — avoid unless your street lists it"],
      faqExtra: { q: "Can I use 105101 for Lekki Phase 1?", a: "Better 105102 — Phase 1 has separate delivery location 102. Many directories group them but NIPOST separates 101 vs 102 last-three; 105102 is correct for Phase 1 estates." },
    },
    "fct-abuja:garki": {
      intro: "Garki is NIPOST HQ itself — Plot 1279 Muhammadu Buhari Way, PMB 12537 Garki 900001. The 900001 you see on forms is literally the mailroom of NIPOST. Garki Areas 1–11 then fan 900241–900247.",
      bullets: ["900001 = Garki Head Office / NIPOST HQ (mail sorting, not a flat)", "900241–247 = Garki Areas 1,2,3,7,8,10,11 — flat-specific codes", "900211 = CBD — next delivery over Constitution Road"],
      faqExtra: { q: "Should I ever post to 900001?", a: "Only if your address is the NIPOST postbox at Garki. For a flat in Garki, use the Area code (e.g. Area 1 900241). 900001 sorts to HQ counters only." },
    },
    "fct-abuja:wuse": {
      intro: "Wuse is Abuja’s original market district — Wuse Market, Banex and Zones 1–7. Wuse Zones 1–7 map 900281–900287, Wuse II 900288 — same first-three 900 but different last-three = different van.",
      bullets: ["900281 = Wuse Zone 1 (market heart)", "900282–287 = Zones 2–7 incremental — use zone number as hint", "900288 = Wuse II (diplomatic fringe) — not Zone 7"],
      faqExtra: { q: "Why so many Wuse codes?", a: "AMAC split Wuse by zones for delivery. Head office kept 001, zones got 281–288 sequential. Use zone-specific code from market directories; HQ code routes to Garki instead." },
    },
    "fct-abuja:maitama": {
      intro: "Maitama is diplomatic hill — Ministers Hill, IBB Way and Transcorp area all use 900271. One wrong digit to Wuse 900281 routes mail across district road.",
      bullets: ["900271 = Maitama — all streets inside district share it", "900231 = Asokoro — across Independence Avenue, different", "900211 = CBD — commercial, not residential Maitama"],
      faqExtra: { q: "Do Maitama houses have different last-three?", a: "No — Maitama’s directories list 900271 for whole district. Unlike Garki’s per-Area splits, Maitama keeps one code; trust 900271 for any Maitama street." },
    },
  };
  const key = `${stateSlug}:${areaSlug}`;
  return map[key] ?? null;
}

export default async function PostalAreaPage({ params }: { params: Promise<{ state: string; area: string }> }) {
  const { state, area } = await params;
  const hit = getPostalPlace(state, area);
  if (!hit) notFound();
  const { state: s, place: p } = hit;
  const path = `/codes/postal/${s.slug}/${p.slug}`;
  const extra = areaExtras(s.slug, p.slug!);
  const leafSet = new Set(getAllPostalAreaParams().map((x) => `${x.state}:${x.area}`));
  const peers = s.places.filter((x) => x.slug !== p.slug && leafSet.has(`${s.slug}:${x.slug}`)).slice(0, 4);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigerian codes", href: "/codes" }, { label: "Postal codes", href: "/codes/postal" }, { label: s.name, href: `/codes/postal/${s.slug}` }, { label: p.name.split("—")[0].trim(), href: path }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{p.code} · {s.name} · {s.zoneCode}xxx</Badge>
          <Badge variant="outline">Verified {s.lastVerified}</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{p.name.split("—")[0].trim()} postal code — {s.name} ({p.code})</h1>
        <p className="text-muted-foreground">
          {extra?.intro ?? `${p.name} in ${s.name} uses NIPOST 6-digit code ${p.code}.`} The first-three digits{" "}
          <code>{p.code.slice(0, 3)}</code> are the dispatch district (sorting centre); the last-three{" "}
          <code>{p.code.slice(3)}</code> are the delivery location. Ending <code>001</code> = head office; other endings =
          distinct post office/campus/estate — that’s why neighbouring streets can differ by one digit.
        </p>
        <ShareControls placement="inline" title={`${p.name.split("—")[0].trim()} postal code — ${s.name} ${p.code}`} url={absUrl(path)} summary={`${p.name.split("—")[0].trim()} (${s.name}) — NIPOST ${p.code}, verified ${s.lastVerified} with sources`} />
      </header>

      <section aria-labelledby="code" className="space-y-3">
        <h2 id="code" className="text-xl font-bold">Primary code — {p.name.split("—")[0].trim()}</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">{p.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{p.label ?? `${s.name} · ${s.range}`}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3">
              <p className="font-mono text-lg font-extrabold tabular-nums">{p.code}</p>
              <CopyButton text={p.code} />
            </div>
            {p.notes ? <p className="text-xs text-muted-foreground">{p.notes}</p> : null}
            {extra ? <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">{extra.bullets.map((b) => <li key={b}>{b}</li>)}</ul> : null}
            <p className="text-xs text-muted-foreground">Last verified {s.lastVerified} · manual · {s.name} · {s.capital} · head office {s.headOfficeCode}</p>
          </CardContent>
        </Card>
      </section>

      {peers.length ? (
        <section aria-labelledby="neighbours" className="space-y-3 rounded-xl border bg-card/40 p-4">
          <h2 id="neighbours" className="text-base font-bold">Neighbouring codes — don’t mix</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {peers.map((q) => (
              <li key={q.name + q.code}>
                <Link href={`/codes/postal/${s.slug}/${q.slug ?? ""}`} className="flex items-center justify-between rounded-lg border bg-background p-3 text-sm hover:border-primary">
                  <span className="font-semibold">{q.name.split("—")[0].trim()}</span>
                  <span className="font-mono text-xs text-muted-foreground">{q.code} →</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground"><Link href={`/codes/postal/${s.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">All {s.places.length} places in {s.name} →</Link></p>
        </section>
      ) : null}

      <section aria-labelledby="sources" className="space-y-2 rounded-xl border bg-card/40 p-4">
        <h2 id="sources" className="text-base font-bold">Sources & how this is verified</h2>
        <p className="text-xs text-muted-foreground">Every code cited appears in at least one public source linked below. Last verified {s.lastVerified} manual. NIPOST counter (nipost.gov.ng) is authoritative when sources conflict; we keep the most consistently cited code with note.</p>
        <ul className="space-y-1 text-sm">
          {s.sources.map((src) => <li key={src.url}><a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">{src.label}</a> <span className="ml-2 break-all text-xs text-muted-foreground">{src.url}</span></li>)}
          {(p.sources ?? []).map((src) => <li key={src.url + p.code} className="text-xs"><span className="font-semibold">{p.name} {p.code}:</span> <a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">{src.label}</a> <span className="ml-2 break-all text-muted-foreground">{src.url}</span></li>)}
        </ul>
      </section>

      <section aria-labelledby="faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="faq" className="text-lg font-bold">Frequently asked questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Can I use {s.headOfficeCode} for {p.name.split("—")[0].trim()}?</h3>
            <p className="mt-1 text-sm text-muted-foreground">No — {s.headOfficeCode} is head office/GPO for {s.capital} (ending 001). {p.name.split("—")[0].trim()} uses {p.code}. Checkouts that validate street/district will misroute to the wrong dispatch if you swap them.</p>
          </div>
          {extra?.faqExtra ? <div><h3 className="text-sm font-semibold">{extra.faqExtra.q}</h3><p className="mt-1 text-sm text-muted-foreground">{extra.faqExtra.a}</p></div> : null}
          <div>
            <h3 className="text-sm font-semibold">What about the 11-char NDAPS code?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Use {p.code} unless a form explicitly asks for the 11-char National Digital Alphanumeric Postcode NIPOST launched 1 Oct 2026. NDAPS is building-level — most e-commerce still needs the 6-digit.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><Link href={`/codes/postal/${s.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">{s.name} all codes</Link></li>
          <li><Link href="/codes/postal" className="font-semibold text-primary underline-offset-2 hover:underline">All states + FCT</Link></li>
          <li><Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">Codes hub</Link></li>
          <li><Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">Bank codes</Link></li>
          <li><Link href="/rates" className="text-muted-foreground underline-offset-2 hover:underline">FX rates</Link></li>
        </ul>
      </section>

      <JsonLd data={[
        breadcrumbSchema(path, p.name.split("—")[0].trim()),
        { "@context": "https://schema.org", "@type": "WebPage", name: `${p.name.split("—")[0].trim()} postal code — ${s.name} ${p.code}`, description: `${p.name} — ${s.name} postal code ${p.code}, NIPOST 6-digit, verified ${s.lastVerified}.`, url: absUrl(path), inLanguage: "en-NG", isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url }, dateModified: s.lastVerified },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: `Can I use ${s.headOfficeCode} for ${p.name.split("—")[0].trim()}?`, acceptedAnswer: { "@type": "Answer", text: `No — ${s.headOfficeCode} is GPO; ${p.name.split("—")[0].trim()} uses ${p.code}.` } }] }
      ]} />
    </div>
  );
}
