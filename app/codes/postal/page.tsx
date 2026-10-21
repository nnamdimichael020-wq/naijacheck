import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { getAllPostalStates, POSTAL_FILE_UPDATED_AT, postalPlaceCount } from "@/lib/postal";
import { PostalSearch } from "@/components/codes/postal-search";

export const metadata: Metadata = pageMetadata({
  path: "/codes/postal",
  title: "Nigeria postal codes (ZIP) — all 36 states + FCT, 6-digit NIPOST codes by area",
  description:
    "All 36 states + FCT postal/ZIP codes in Nigeria: 6-digit NIPOST codes by LGA/district with sources and copy button. Lagos 100001, Abuja 900001, Port Harcourt 500001 — search by state, city, LGA or code. Last verified 2026-10-21.",
  keywords: [
    "Nigeria postal codes",
    "Nigeria ZIP code",
    "Lagos postal code",
    "Abuja postal code",
    "Port Harcourt ZIP code",
    "NIPOST postal codes",
    "Lagos ZIP code 100001",
    "Abuja ZIP 900001",
    "Nigeria ZIP codes list",
  ],
});

export default function PostalHubPage() {
  const states = getAllPostalStates();
  const updatedAt = POSTAL_FILE_UPDATED_AT ?? "2026-10-21";
  const places = postalPlaceCount();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigerian codes", href: "/codes" }, { label: "Postal codes", href: "/codes/postal" }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">37 states + FCT · {places} verified places</Badge>
          <span className="text-xs font-medium text-muted-foreground">Updated {updatedAt} · manual · ₦0 · no scraping</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Nigeria postal codes (ZIP) — 6-digit NIPOST codes by state & district</h1>
        <p className="text-muted-foreground">
          Nigeria uses <strong>6-digit numeric postal codes</strong> issued by <strong>NIPOST</strong> — not a single national
          ZIP. The first digit is the postal region (1–9), the first three digits the dispatch district (sorting centre),
          the last three the delivery location (post office, urban/rural area). Head offices end in{" "}
          <code>001</code>: Ikeja 100001, Garki 900001, Port Harcourt 500001. On{" "}
          <strong>1 Oct 2026 NIPOST launched the 11-char National Digital Alphanumeric Postcode (NDAPS)</strong> per building
          (e.g. FC 02 A09 DB 09) — 6-digit codes remain accepted on most forms; use 6-digit unless a form asks for NDAPS.
          Nigeria doesn’t use ZIP daily, but foreign shops, visas and parcels do — use the district code for your street.
        </p>
        <ShareControls placement="inline" title="Nigeria postal codes (ZIP) — all states + FCT" url={absUrl("/codes/postal")} summary={`${states.length} states + FCT — ${places} NIPOST 6-digit codes, every one sourced (${updatedAt})`} />
      </header>

      <section aria-labelledby="how-it-works" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="how-it-works" className="text-xl font-bold">How a Nigerian “ZIP” works — in 15 seconds</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li><strong>First digit</strong> = region (1 = Lagos/Ogun, 2 = Oyo/Osun, 9 = Abuja/FCT belt).</li>
          <li><strong>First three digits</strong> = dispatch district (sorting centre). E.g. Lagos 100 = Ikeja hub, Abuja 900 = Garki HQ.</li>
          <li><strong>Last three digits</strong> = delivery location (post office, estate, campus, village route). Change street → often change last three.</li>
          <li><strong>Ending 001</strong> = head office for that district (why capitals show 100001, 900001, 500001).</li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Example: Victoria Island 101241 — <code>1</code> = South-West region, <code>101</code> = Lagos Island/Eti-Osa dispatch,{" "}
          <code>241</code> = VI delivery. Ikeja GPO 100001 — <code>100</code> = Ikeja dispatch, <code>001</code> = GPO. Lekki 105102 keeps
          <code>105</code> dispatch but changes delivery to <code>102</code>.
        </p>
        <p className="text-xs text-muted-foreground">
          NDAPS note: NIPOST’s new 11-char per-building code is <em>separate</em> from these 6-digit codes. We keep showing
          6-digit because that’s what most checkout forms still accept. When NDAPS is required we’ll note it.
        </p>
      </section>

      <section aria-labelledby="search" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="search" className="text-lg font-bold">Search every state & district</h2>
        <p className="text-sm text-muted-foreground">Search “Lagos”, “Kano 700001”, “Wuse 900281”, “Ikorodu”, “Rivers” — instant, no reload.</p>
        <PostalSearch states={states} />
      </section>

      <section aria-labelledby="states-grid" className="space-y-3">
        <h2 id="states-grid" className="text-xl font-bold">All 36 states + FCT — open a state</h2>
        <p className="text-sm text-muted-foreground">Each state page has its own intro (not a swapped template), head-office code in large type, places table with copy, last-verified date and sources. Missing street → “not in sources yet”, never fake.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {states.map((s) => (
            <li key={s.slug}>
              <Link href={`/codes/postal/${s.slug}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary">
                <span className="font-semibold">{s.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{s.headOfficeCode} · {s.places.length} places →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">Codes hub</Link></li>
          <li><Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">Bank codes (sort & USSD)</Link></li>
          <li><Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">FX rates & history</Link></li>
          <li><Link href="/status" className="font-semibold text-primary underline-offset-2 hover:underline">How we verify sources</Link></li>
          <li><Link href="/about" className="text-muted-foreground underline-offset-2 hover:underline">About NaijaCheck</Link></li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/codes/postal", "Postal codes"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Nigeria postal codes (ZIP) — all 36 states + FCT",
            description: "All 36 states + FCT postal/ZIP codes: 6-digit NIPOST codes by LGA/district with sources.",
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
