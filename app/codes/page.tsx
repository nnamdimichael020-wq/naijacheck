import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { getAllBanks, banksUpdatedAt } from "@/lib/banks";
import { getAllPostalStates, POSTAL_FILE_UPDATED_AT, postalPlaceCount } from "@/lib/postal";
import { LGAS_FILE_UPDATED_AT, lgaCounts } from "@/lib/lgas";

export const metadata: Metadata = pageMetadata({
  path: "/codes",
  title: "Nigerian codes — bank sort & USSD codes plus postal / ZIP codes by state",
  description:
    "Nigerian codes hub: bank sort codes (CBN/NIP) + USSD codes for GTB *737#, Access *901# and 10 more banks, plus postal/ZIP codes for all 36 states + FCT — 6-digit NIPOST codes by area with sources and copy button. Plus 774 LGAs via /geo. Last verified 2026-10-21.",
  keywords: [
    "Nigeria bank sort codes",
    "GTBank sort code",
    "Access Bank sort code",
    "Nigeria postal codes",
    "Nigeria ZIP codes",
    "Lagos postal code",
    "Abuja postal code 900001",
    "bank USSD codes Nigeria",
    "CBN bank codes",
    "NIPOST postal codes",
    "Nigeria 774 LGAs",
  ],
});

export default function CodesHubPage() {
  const banks = getAllBanks();
  const postalStates = getAllPostalStates();
  const postalUpdatedAt = POSTAL_FILE_UPDATED_AT ?? banksUpdatedAt() ?? "2026-10-21";
  const postalPlaces = postalPlaceCount();
  const { lgas: lgaTotal, states: lgaStateCount } = lgaCounts();
  const lgasUpdatedAt = LGAS_FILE_UPDATED_AT ?? "2026-10-21";
  const featured = banks.slice(0, 6);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigerian codes", href: "/codes" }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Verified manually · every code cites its source</Badge>
          <span className="text-xs font-medium text-muted-foreground">Updated {postalUpdatedAt} · {banks.length} banks · {postalStates.length} states · {postalPlaces} places · {lgaTotal} LGAs · ₦0 research, no scraping</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Nigerian codes — bank sort/USSD & postal / ZIP codes</h1>
        <p className="text-muted-foreground">
          Nigeria has two families people Google as “codes”: <strong>bank codes</strong> (3-digit sort/NIP for transfers +{" "}
          <code>*901#</code>-style USSD you dial on your phone) and <strong>postal/ZIP codes</strong> (6-digit NIPOST numbers
          for forms and parcels, e.g. Ikeja 100001, Garki 900001 — Nigeria doesn’t use ZIP daily; you need the right one for
          international forms). This hub is the honest directory: one index per family, one page per bank and one per state,
          every code with a source link, copy button and last-verified date. No mass junk URLs, no invented codes.{" "}
          <strong>LGAs</strong> now live at <Link href="/geo" className="underline">/geo — {lgaTotal} LGAs across {lgaStateCount} states/FCT</Link> (verified {lgasUpdatedAt}) — same slug scheme as postal.
        </p>
        <ShareControls placement="inline" title="Nigerian codes — banks + postal/ZIP" url={absUrl("/codes")} summary={`${banks.length} banks + ${postalStates.length} states (${postalPlaces} places) + ${lgaTotal} LGAs — every code sourced and verified ${postalUpdatedAt}`} />
      </header>

      <section aria-labelledby="sort-vs-ussd" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="sort-vs-ussd" className="text-xl font-bold">Sort code vs USSD — which do you need?</h2>
        <ul className="grid gap-3 sm:grid-cols-2 text-sm">
          <li className="rounded-lg border bg-background p-3">
            <p className="font-semibold">Sort code (NIP/CBN 044, 058…)</p>
            <p className="mt-1 text-muted-foreground">Used when someone asks for your bank branch code or you enter a bank code online for transfers. 3 digits — first 3 of your 10-digit NUBAN account. Example: GTBank 058, Access Bank 044, Zenith 057, First Bank 011.</p>
          </li>
          <li className="rounded-lg border bg-background p-3">
            <p className="font-semibold">USSD (*901#, *737#, *966#…)</p>
            <p className="mt-1 text-muted-foreground">Dialled on your phone, works without internet on MTN/Airtel/Glo/9mobile: <code>*901#</code> for Access, <code>*737#</code> for GTB, <code>*966#</code> for Zenith, <code>*894#</code> for FirstBank, <code>*919#</code> for UBA and more. You must dial from the number linked to the account.</p>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">Tip: sort codes are for <em>identifying the bank</em>; USSD codes are for <em>operating the account</em> from a phone. Both can change — always confirm in the official app/bank.</p>
      </section>

      <section aria-labelledby="by-bank" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="by-bank" className="text-xl font-bold">Browse by bank</h2>
          <Link href="/codes/banks" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 text-sm font-semibold hover:border-primary hover:text-primary">
            Open full banks index — searchable →
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">12 major retail commercial banks — quality over “all 200+ codes”. Each page lists corporate headquarters, CBN licence tier, sort code(s), USSD shortcuts (only when sourced), source links and last-verified date ({banksUpdatedAt()}).</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {featured.map((b) => (
            <li key={b.slug}>
              <Link href={`/codes/banks/${b.slug}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary">
                <span className="font-semibold">{b.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{b.sortCodes[0]?.code} · {b.ussd[0]?.code} →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Full list: {banks.map((b, i) => (
          <span key={b.slug}>{i ? " · " : null}<Link href={`/codes/banks/${b.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">{b.name}</Link></span>
        ))} · <Link href="/codes/banks" className="font-semibold underline-offset-2 hover:underline">all banks index</Link></p>
      </section>

      <section aria-labelledby="postal-hub" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="postal-hub" className="text-xl font-bold">Postal / ZIP codes — by state & district</h2>
          <Badge variant="outline">{postalStates.length} states · {postalPlaces} places · {postalUpdatedAt}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Every capital has a 6-digit head-office code (Ikeja 100001, Garki 900001, Port Harcourt 500001). Districts use the
          same first-three digits with different last-three — VI 101241 ≠ Lekki 105102. This archive lists verified codes
          only; missing street = “not in sources yet”, never a fake. Also notes the 11-char NDAPS NIPOST launched 1 Oct 2026
          for building-level use.
        </p>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li>
            <Link href="/codes/postal" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90">
              Open postal hub — all states & search →
            </Link>
          </li>
          <li>
            <Link href="/codes/postal/lagos" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">Lagos 100001 →</Link>
          </li>
          <li>
            <Link href="/codes/postal/fct-abuja" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">FCT Abuja 900001 →</Link>
          </li>
          <li>
            <Link href="/codes/postal/rivers" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">Rivers 500001 →</Link>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Popular:{" "}
          {postalStates.slice(0, 10).map((s, i) => (
            <span key={s.slug}>
              {i ? " · " : null}
              <Link href={`/codes/postal/${s.slug}`} className="font-semibold text-primary underline-offset-2 hover:underline">
                {s.name} {s.headOfficeCode}
              </Link>
            </span>
          ))}{" "}
          <Link href="/codes/postal" className="font-semibold underline-offset-2 hover:underline">all {postalStates.length} states →</Link>
        </p>
      </section>

      <section aria-labelledby="what-next" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="what-next" className="text-base font-bold">What else lives in this Codes hub?</h2>
        <p className="text-sm text-muted-foreground">
          Bank codes + postal codes + 774 LGAs are live. Exam PDFs are <em>not</em> in this PR — no empty
          junk URLs. Cross-links to <Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">FX rates</Link> and{" "}
          <Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">bank codes</Link> stay.
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li><Link href="/codes/banks" className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 font-semibold hover:border-primary">Banks — sort & USSD codes<span aria-hidden>→</span></Link></li>
          <li><Link href="/codes/postal" className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 font-semibold hover:border-primary">Postal codes — {postalStates.length} states, {postalPlaces} places<span aria-hidden>→</span></Link></li>
          <li><Link href="/geo" className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 font-semibold hover:border-primary">LGAs — {lgaTotal} LGAs across {lgaStateCount} states/FCT · {lgasUpdatedAt}<span aria-hidden>→</span></Link></li>
          <li><Link href="/exam" className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 font-semibold hover:border-primary">Exam hub — under /exam<span aria-hidden>→</span></Link></li>
        </ul>
        <p className="text-xs text-muted-foreground">LGA URL scheme: <code>/geo</code> hub → <code>/geo/[state]</code> (matches <code>/codes/postal/[state]</code> slugs) → <code>/geo/[state]/[lga-slug]</code>. No duplicate tree under <code>/codes/lga</code> — documented in runbook.</p>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related on NaijaCheck</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><Link href="/codes/postal" className="font-semibold text-primary underline-offset-2 hover:underline">All postal codes (searchable)</Link></li>
          <li><Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">All bank codes</Link></li>
          <li><Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">FX rates & history</Link></li>
          <li><Link href="/prices/fuel" className="font-semibold text-primary underline-offset-2 hover:underline">Fuel depot history</Link></li>
          <li><Link href="/status" className="font-semibold text-primary underline-offset-2 hover:underline">How we verify sources (/status)</Link></li>
          <li><Link href="/about" className="text-muted-foreground underline-offset-2 hover:underline">About NaijaCheck</Link></li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/codes", "Nigerian codes"),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Nigerian codes — bank sort & USSD codes plus postal/ZIP codes",
            description: `Nigerian codes hub: ${banks.length} banks — sort & USSD codes — plus ${postalStates.length} states (${postalPlaces} places) of postal/ZIP codes with sources.`,
            url: absUrl("/codes"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: postalUpdatedAt,
          },
        ]}
      />
    </div>
  );
}
