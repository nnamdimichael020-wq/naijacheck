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
import { getAllPostalStates, getAllPostalStateSlugs, getPostalState, getAllPostalAreaParams } from "@/lib/postal";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllPostalStateSlugs().map((state) => ({ state }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  const { state } = await params;
  const s = getPostalState(state);
  if (!s) return { title: "Not found" };
  const title = `${s.name} State postal codes (ZIP) — list by area | ${s.headOfficeCode} + ${s.places.length - 1} more`;
  const description =
    s.slug === "lagos"
      ? `Lagos State postal codes (ZIP) — Ikeja ${s.headOfficeCode} + districts: VI 101241, Lekki 105102, Surulere 101283, Ikorodu 104101 and 8 more — every 6-digit NIPOST code with copy, sources and last-verified ${s.lastVerified}.`
      : s.slug === "fct-abuja"
      ? `FCT Abuja postal codes — Garki ${s.headOfficeCode} + districts: CBD 900211, Asokoro 900231, Maitama 900271, Wuse 900281, Gwarinpa 900108 and 8 more — every NIPOST code sourced ${s.lastVerified}.`
      : s.slug === "rivers"
      ? `Rivers State postal codes — Port Harcourt ${s.headOfficeCode} + Obio-Akpor 500102, Okrika, Eleme — every 6-digit NIPOST code with copy, sources, verified ${s.lastVerified}.`
      : `${s.name} State postal code (ZIP) — head office ${s.headOfficeCode} (${s.capital}) plus ${s.places.length - 1} district codes: ${s.places.slice(1, 4).map((p) => `${p.name.split("—")[0].trim()} ${p.code}`).join(", ") || "more areas"} — all with copy, sources, verified ${s.lastVerified}.`;
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
  const faqs = [
    {
      q: `Can I use one code for all of ${s.name}?`,
      a:
        s.slug === "lagos"
          ? `No. Lagos has no single ZIP — Ikeja head office is 100001 but VI is 101241, Lekki is 105102, Ikorodu is 104101. Forms that check street/district will reject 100001 for a Lekki address. Use the district code from the table; when unsure use 100001 plus full street/town/LGA in address lines.`
          : s.slug === "fct-abuja"
          ? `No. FCT does not use one code — Garki HQ is 900001 but Maitama is 900271, Asokoro 900231, Wuse 900281, Gwarinpa 900108. Use the district’s code; the HQ code is only a fallback when a form insists on “any valid Abuja code”.`
          : `No. ${s.headOfficeCode} is the head-office/GPO code for ${s.capital}. Districts and large towns use the same first-three digits (${s.zoneCode}) with different last-three. Use the row that matches your street/LGA; fall back to ${s.headOfficeCode} only if a foreign checkout rejects the district code.`,
    },
    {
      q: `Is ${s.headOfficeCode} the “official ZIP” for ${s.name}?`,
      a: `${s.headOfficeCode} is the NIPOST head-office code for ${s.capital} (ending 001). We show it as primary because NIPOST assigns 001 to head offices and most directories quote it. It is valid for ${s.capital} but not automatically for every village — check the places table for your LGA.`,
    },
    {
      q: `What about the new 11-char NIPOST code?`,
      a: `On 1 Oct 2026 NIPOST launched the National Digital Alphanumeric Postcode (NDAPS) — 11 chars per building (state+LGA+district+area+building). Until your bank/parcel form explicitly asks for NDAPS, the 6-digit code on this page is what to enter in a field labelled ZIP/postal code.`,
    },
    {
      q: `How do I get the code for a hamlet not listed?`,
      a: `If your street isn’t in our table, it means we couldn’t verify it in at least one public source — we never invent a 6-digit line. Use ${s.headOfficeCode} (head office) plus full address, and ask your nearest NIPOST post office counter for the exact last-three digits (Post Office Finder at nipost.gov.ng). When we verify it we’ll add it.`,
    },
  ];
  return (
    <section aria-labelledby="faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
      <h2 id="faq" className="text-lg font-bold">Frequently asked questions — {s.name}</h2>
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
  const path = `/codes/postal/${s.slug}`;
  const otherStates = getAllPostalStates().filter((x) => x.slug !== s.slug).slice(0, 6);
  const leaves = getAllPostalAreaParams().filter((l) => l.state === s.slug);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigerian codes", href: "/codes" }, { label: "Postal codes", href: "/codes/postal" }, { label: s.name, href: path }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Head office {s.headOfficeCode} · {s.zoneCode}xxx · {s.range ?? ""}</Badge>
          <Badge variant="outline">Verified {s.lastVerified}</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{s.name} State postal codes (ZIP) — list by area</h1>
        <p className="text-muted-foreground">{s.intro} Head office is <strong>{s.headOfficeCode}</strong> ({s.capital}). Use the district row that matches your street/LGA — ending <code>001</code> is the GPO, other endings are delivery locations. Codes are for international forms and parcels; Nigeria doesn’t use ZIP daily but the right last-three avoids misrouting.</p>
        <ShareControls placement="inline" title={`${s.name} postal codes — ${s.headOfficeCode} + ${s.places.length - 1} districts`} url={absUrl(path)} summary={`${s.name}: ${s.headOfficeCode} + ${s.places.length - 1} more NIPOST codes — every one sourced, verified ${s.lastVerified}`} />
      </header>

      <section aria-labelledby="head-code" className="space-y-3">
        <h2 id="head-code" className="text-xl font-bold">Head office code — {s.name}</h2>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">GPO / head office</CardTitle>
            <p className="text-xs text-muted-foreground">{s.capital} · {s.zoneCode}xxx · {s.range ?? ""}</p>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3">
              <div>
                <p className="font-mono text-lg font-extrabold tabular-nums">{s.headOfficeCode}</p>
                <p className="text-xs text-muted-foreground">Head office / GPO — main code for {s.capital}</p>
              </div>
              <CopyButton text={s.headOfficeCode} />
            </div>
            <p className="text-xs text-muted-foreground">Last verified {s.lastVerified} · verification: manual · {s.notes ?? ""}</p>
            {leaves.length ? (
              <p className="text-xs text-muted-foreground">
                High-intent districts: {leaves.map((l, i) => (
                  <span key={l.area}>{i ? " · " : null}<Link href={`/codes/postal/${s.slug}/${l.area}`} className="font-semibold text-primary underline-offset-2 hover:underline">{l.area.replace(/-/g, " ")}</Link></span>
                ))}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="places" className="space-y-3">
        <h2 id="places" className="text-xl font-bold">All verified places — {s.name} ({s.places.length})</h2>
        <p className="text-sm text-muted-foreground">Each row shows place name, 6-digit code and copy button. Missing village = not verified in our sources yet — never a fake. Use the nearest verified code plus full address.</p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Place | postal code | notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-2 py-2 font-semibold">Place</th>
                    <th className="px-2 py-2 font-semibold">Postal code</th>
                    <th className="px-2 py-2 font-semibold">Copy</th>
                    <th className="px-2 py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {s.places.map((p) => (
                    <tr key={p.name + p.code} className="border-b last:border-0">
                      <td className="px-2 py-2">
                        <span className="font-semibold">{p.name}</span>
                        {p.label ? <span className="block text-xs text-muted-foreground">{p.label}</span> : null}
                      </td>
                      <td className="px-2 py-2 font-mono font-bold tabular-nums">{p.code}</td>
                      <td className="px-2 py-2"><CopyButton text={p.code} /></td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">{p.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Endings 001 are head-office codes; other endings identify delivery location. When NIPOST conflicts across compilations we keep the most consistently cited code and note the alternative — see Sources.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="sources" className="space-y-2 rounded-xl border bg-card/40 p-4">
        <h2 id="sources" className="text-base font-bold">Sources & how this page is verified</h2>
        <p className="text-xs text-muted-foreground">Every code above appears in at least one public source linked here. “Compilation” = public NIPOST-style directory (industry-wide); “secondary” means not NIPOST official corporate page — NIPOST’s corporate site is nipost.gov.ng and it now points to NDAPS after 1 Oct 2026. Last verified {s.lastVerified} — manual check of each source. If a code changes the NIPOST counter is authoritative.</p>
        <ul className="space-y-1 text-sm">
          {s.sources.map((src) => (
            <li key={src.url}><a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">{src.label}</a> <span className="ml-2 break-all text-xs text-muted-foreground">{src.url}</span></li>
          ))}
          {/* per-place sources where divergent */}
          {s.places.filter((p) => p.sources?.length).slice(0, 5).map((p) => (
            <li key={p.code + p.name} className="text-xs">
              <span className="font-semibold">{p.name} {p.code}:</span>{" "}
              {(p.sources ?? []).map((src, i) => (
                <span key={src.url} className="break-all">{i ? " · " : null}<a href={src.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">{src.label}</a></span>
              ))}
            </li>
          ))}
        </ul>
      </section>

      <Faq s={s} />

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Other states</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {otherStates.map((o) => (
            <li key={o.slug}><Link href={`/codes/postal/${o.slug}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary"><span className="font-semibold">{o.name}</span><span className="font-mono text-xs text-muted-foreground">{o.headOfficeCode} →</span></Link></li>
          ))}
        </ul>
        <p className="text-sm"><Link href="/codes/postal" className="font-semibold text-primary underline-offset-2 hover:underline">All {getAllPostalStates().length} states + FCT →</Link> {" · "}<Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">Bank codes</Link> {" · "}<Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">Codes hub</Link> {" · "}<Link href="/rates" className="text-muted-foreground underline-offset-2 hover:underline">FX rates</Link></p>
      </section>

      <JsonLd data={[
        breadcrumbSchema(path, s.name),
        { "@context": "https://schema.org", "@type": "WebPage", name: `${s.name} State postal codes — ${s.headOfficeCode} + districts`, description: `${s.name} postal codes: ${s.headOfficeCode} (${s.capital}) + ${s.places.length - 1} district codes with sources.`, url: absUrl(path), inLanguage: "en-NG", isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url }, dateModified: s.lastVerified },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [
          { "@type": "Question", name: `Can I use one code for all of ${s.name}?`, acceptedAnswer: { "@type": "Answer", text: `No — ${s.headOfficeCode} is head office only; districts use different last-three digits.` } },
          { "@type": "Question", name: `Is ${s.headOfficeCode} the official ZIP for ${s.name}?`, acceptedAnswer: { "@type": "Answer", text: `${s.headOfficeCode} is the GPO code for ${s.capital} (ending 001).` } },
        ] }
      ]} />
    </div>
  );
}
