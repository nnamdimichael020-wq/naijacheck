import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import { getAllBanks, banksUpdatedAt } from "@/lib/banks";
import { BanksSearch } from "@/components/codes/banks-search";

export const metadata: Metadata = pageMetadata({
  path: "/codes/banks",
  title: "Nigerian bank codes directory — all sort & USSD codes",
  description:
    "Search every Nigerian bank sort code (CBN/NIP) and USSD code in one place: GTB 058 *737#, Access 044 *901#, Zenith 057 *966#, FirstBank 011 *894#, UBA 033 *919# + 7 more. Copy, verify and check the source on each bank page. Last verified 2026-10-21.",
  keywords: [
    "Nigerian bank codes list",
    "bank sort codes Nigeria",
    "USSD codes Nigeria banks",
    "CBN bank codes",
    "GTBank USSD code",
    "Access Bank USSD code",
    "Zenith Bank USSD code",
    "First Bank sort code",
  ],
});

export default function BanksIndexPage() {
  const banks = getAllBanks();
  const updatedAt = banksUpdatedAt();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigerian codes", href: "/codes" }, { label: "Banks", href: "/codes/banks" }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">12 banks · manually verified {updatedAt}</Badge>
          <span className="text-xs font-medium text-muted-foreground">Every code links to its source. No guessing.</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Nigerian bank sort & USSD codes — searchable directory</h1>
        <p className="text-muted-foreground">
          Find the bank you need, copy the 3-digit <strong>NIP/CBN sort code</strong> (for NUBAN transfers) or dial the{" "}
          <strong>USSD short code</strong> (<code>*901#</code>-style) on the phone linked to your account. Open the bank page for
          the full list of transfer, airtime and emergency-block shortcuts, notes, last-verified date and source links. No
          invented codes: if a shortcut is not sourced, we mark it omitted or <code>unverified</code> and link you to the
          official app/branch.
        </p>
        <ShareControls placement="inline" title="Nigerian bank sort & USSD codes — directory" url={absUrl("/codes/banks")} summary={`12 banks — sort codes & USSD codes, every entry sourced (verified ${updatedAt})`} />
      </header>

      <section aria-labelledby="search" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="search" className="text-lg font-bold">Search by bank, code or name</h2>
        <p className="text-sm text-muted-foreground">Try “GTBank”, “058”, “*737#”, “Zenith”, “FCMB”… Matching is case-insensitive.</p>
        <BanksSearch banks={banks} />
      </section>

      <section aria-labelledby="about-sort" className="space-y-2 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="about-sort" className="text-base font-bold">What counts as a “sort code” in Nigeria?</h2>
        <p className="text-muted-foreground">
          In everyday talk Nigerians ask for the bank “sort code” when they mean the 3-digit <strong>NIP code</strong> (044 for
          Access, 058 for GTBank, 057 for Zenith, 011 for First Bank, 033 for UBA). It is the same number the CBN/NIBSS uses to
          identify the bank in instant transfers. Some branches also have a 9-digit cheque-clearing sort code whose first 3
          digits match the NIP code (e.g. Access 044150149). Where we have a source, we show both — head-office codes are
          marked “example” because many branches share their own. No street-level mass URLs: one page per bank.
        </p>
      </section>

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Related</h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li><Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">Codes hub</Link></li>
          <li><Link href="/status" className="font-semibold text-primary underline-offset-2 hover:underline">Data status & source health</Link></li>
          <li><Link href="/about" className="text-muted-foreground underline-offset-2 hover:underline">About NaijaCheck</Link></li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/codes/banks", "Banks"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Nigerian bank codes directory — all sort & USSD codes",
            description: "Search every Nigerian bank sort code (CBN/NIP) and USSD code in one place with sources and copy buttons.",
            url: absUrl("/codes/banks"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: updatedAt,
          },
        ]}
      />
    </div>
  );
}
