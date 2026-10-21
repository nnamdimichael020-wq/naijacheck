import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { getAllBanks, banksUpdatedAt } from "@/lib/banks";

export const metadata: Metadata = pageMetadata({
  path: "/codes",
  title: "Nigeria bank codes — sort codes & USSD codes (GTB, Access, Zenith, FirstBank)",
  description:
    "Nigerian bank sort codes (CBN/NIP 3-digit codes & head-office sort codes) plus USSD codes for GTB *737#, Access *901#, Zenith *966#, FirstBank *894# and 8 more banks — each with copy, listed source and last-verified date.",
  keywords: [
    "Nigeria bank sort codes",
    "GTBank sort code",
    "Access Bank sort code",
    "Zenith Bank sort code",
    "First Bank sort code",
    "UBA USSD code",
    "bank USSD codes Nigeria",
    "CBN bank codes",
    "NIP bank codes Nigeria",
  ],
});

export default function CodesHubPage() {
  const banks = getAllBanks();
  const updatedAt = banksUpdatedAt();
  const featured = banks.slice(0, 6);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigerian codes", href: "/codes" }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Verified manually · every code cites its source</Badge>
          <span className="text-xs font-medium text-muted-foreground">Updated {updatedAt} · {banks.length} banks · ₦0 research, no scraping</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Nigeria bank codes — sort codes & USSD codes</h1>
        <p className="text-muted-foreground">
          Nigerian banks have two “codes” people ask for: <strong>sort codes</strong> and <strong>USSD short codes</strong>. A
          sort code is the 3-digit <abbr title="Nigeria Instant Payments / Central Bank of Nigeria">NIP/CBN</abbr> bank code
          that identifies the bank in NUBAN transfers (many banks also have a 9-digit head-office cheque-clearing code — we
          show it where sourced). A <strong>USSD code</strong> is the <code>*901#</code>-style string you dial on the phone
          linked to your account to check balance, transfer money or buy airtime. This hub is the honest directory: one
          index, one page per bank, every code with a source link, copy button and last-verified date. No mass junk URLs
          (“sort code for every street”), no invented codes.
        </p>
        <ShareControls placement="inline" title="Nigeria bank sort codes & USSD codes" url={absUrl("/codes")} summary={`${banks.length} banks — every code sourced and manually verified ${updatedAt}`} />
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
        <p className="text-sm text-muted-foreground">12 major retail banks to start — quality over “all 200+ codes”. Each page lists sort code(s), USSD shortcuts (only when sourced), notes, source links and last-verified date.</p>
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

      <section aria-labelledby="what-next" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="what-next" className="text-base font-bold">What else lives in this Codes hub?</h2>
        <p className="text-sm text-muted-foreground">This is a <strong>category</strong> hub — one doorway. Bank codes are live now. Other archives (postal/ZIP codes, LGA lists, exam materials) are <em>planned, not yet shipped</em> — there are no empty junk URLs for them in this PR, and they will not launch until they can be built with the same sourcing bar (every code cited, zero invention).</p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          <li><Link href="/codes/banks" className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 font-semibold hover:border-primary">Banks — sort & USSD codes<span aria-hidden>→</span></Link></li>
          <li><span className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-muted-foreground">Postal codes — planned, not yet live<span aria-hidden>•</span></span></li>
          <li><span className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-muted-foreground">LGA directory — planned, not yet live<span aria-hidden>•</span></span></li>
          <li><span className="inline-flex min-h-11 w-full items-center justify-between rounded-lg border bg-background px-4 py-3 text-muted-foreground">Exam hub — existing, under /exam<span aria-hidden>→</span></span></li>
        </ul>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related on NaijaCheck</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">All bank codes (searchable)</Link></li>
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
            name: "Nigeria bank codes — sort codes & USSD codes",
            description: "Nigerian bank sort codes (CBN/NIP) plus USSD codes for GTB *737#, Access *901#, Zenith *966#, FirstBank *894# and more — every code sourced.",
            url: absUrl("/codes"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: updatedAt,
          },
        ]}
      />
    </div>
  );
}
