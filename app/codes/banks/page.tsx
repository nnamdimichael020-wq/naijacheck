import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { ShareControls } from "@/components/share-controls";
import { CopyButton } from "@/components/codes/copy-button";
import { absUrl, breadcrumbSchema, pageMetadata } from "@/lib/seo";
import { SITE_CONFIG } from "@/config/site";
import {
  BANKS_FILE_SCOPE,
  bankLicenceTierShort,
  banksUpdatedAt,
  getAllBanks,
  getBanksHubSources,
} from "@/lib/banks";
import { BanksSearch } from "@/components/codes/banks-search";

export const metadata: Metadata = pageMetadata({
  path: "/codes/banks",
  title: "List of commercial banks in Nigeria — sort codes, USSD & HQ",
  description:
    "Commercial banks in Nigeria (12 major retail Deposit Money Banks we list): 3-digit CBN/NIP sort codes, primary USSD (*737#, *901#, *966#…), Lagos headquarters, CBN licence tier and verified sources (2026-10-23).",
  keywords: [
    "list of banks in Nigeria",
    "commercial banks in Nigeria",
    "bank sort codes Nigeria",
    "bank sort codes and USSD Nigeria",
    "USSD codes Nigeria banks",
    "CBN bank codes",
    "Nigerian bank headquarters",
    "GTBank sort code",
    "Access Bank USSD code",
  ],
});

export default function BanksIndexPage() {
  const banks = getAllBanks();
  const updatedAt = banksUpdatedAt();
  const hubSources = getBanksHubSources();
  const intlCount = banks.filter((b) => bankLicenceTierShort(b.licenceType) === "International").length;
  const natlCount = banks.filter((b) => bankLicenceTierShort(b.licenceType) === "National").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Nigerian codes", href: "/codes" },
          { label: "Commercial banks", href: "/codes/banks" },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            {banks.length} major retail banks · verified {updatedAt}
          </Badge>
          <Badge variant="outline">
            {intlCount} International · {natlCount} National CBN licences
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">
            Every HQ, licence tier &amp; code cites a public source.
          </span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          List of commercial banks in Nigeria — sort codes, USSD &amp; headquarters
        </h1>

        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Copy the 3-digit <strong>NIP/CBN sort code</strong> (used to identify a Nigerian bank in instant NUBAN
          transfers), dial the <strong>primary USSD code</strong> (<code>*737#</code>, <code>*901#</code>,{" "}
          <code>*966#</code>) from the mobile line linked to your account, or check each bank’s corporate headquarters
          and CBN authorisation tier.{" "}
          <strong>Dataset scope:</strong> {banks.length} major retail Deposit Money Banks we list ({intlCount}{" "}
          International + {natlCount} National commercial banking licences, manually verified {updatedAt}) — not a list
          of every regional, merchant, non-interest or microfinance bank. Always confirm critical transfer details in
          your bank’s official app or branch.
        </p>

        <nav aria-label="On-page sections" className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
          <a
            href="#directory"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Searchable table ({banks.length})
          </a>
          <a
            href="#all-sort-codes"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            All sort codes &amp; licence tiers
          </a>
          <a
            href="#sources"
            className="inline-flex min-h-11 items-center rounded-full border bg-background px-3.5 py-1.5 hover:border-primary hover:text-primary"
          >
            Methodology &amp; sources
          </a>
        </nav>

        <ShareControls
          placement="inline"
          title="Commercial banks in Nigeria — sort codes, USSD & headquarters"
          url={absUrl("/codes/banks")}
          summary={`${banks.length} major retail commercial banks in Nigeria — sort codes, USSD, headquarters & CBN licence tiers (verified ${updatedAt})`}
        />
      </header>

      <section id="directory" aria-labelledby="directory-h" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="directory-h" className="text-lg font-bold">
            Commercial banks directory — codes, USSD &amp; headquarters
          </h2>
          <span className="text-xs text-muted-foreground">Tap Copy on any code · open bank name for all USSD rows</span>
        </div>
        <BanksSearch banks={banks} />
      </section>

      <section id="all-sort-codes" aria-labelledby="all-sort-codes-h" className="space-y-4 rounded-xl border bg-card/40 p-4 text-sm">
        <div className="space-y-1">
          <h2 id="all-sort-codes-h" className="text-lg font-bold">
            All sort codes &amp; CBN commercial banking licence tiers compared
          </h2>
          <p className="text-muted-foreground">
            Nigerians ask for a bank’s “sort code” in two situations: the 3-digit <strong>NIP/CBN bank code</strong>{" "}
            used by fintech apps and instant transfers (identical across the whole bank), and the 9-digit{" "}
            <strong>branch cheque-clearing sort code</strong> whose first 3 digits match the NIP code (e.g. GTBank{" "}
            <code>058</code> → head office <code>058152052</code>). We keep all {banks.length} retail commercial banks
            on this single comparison table rather than splitting branch numbers into thin pages.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-background p-3.5">
            <p className="font-bold">International Commercial Licence ({intlCount} listed)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Authorised by the CBN to operate across all 36 states + FCT and maintain offshore banking subsidiaries
              subject to host-country approval (₦500bn minimum paid-up capital benchmark under the 2024–2026 CBN
              recapitalisation framework): Access Bank, Fidelity Bank, FCMB, First Bank, GTBank, UBA and Zenith Bank.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3.5">
            <p className="font-bold">National Commercial Licence ({natlCount} listed)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Authorised by the CBN to operate nationwide across every Nigerian state + FCT (₦200bn minimum paid-up
              capital benchmark): Ecobank Nigeria, Stanbic IBTC Bank, Sterling Bank, Union Bank and Wema Bank.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-background">
          <table className="w-full min-w-[560px] border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Bank &amp; legal entity
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  3-digit NIP
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  9-digit HQ sort example
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Corporate HQ district
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {banks.map((b) => {
                const nip = b.sortCodes.find((s) => s.type === "nip") ?? b.sortCodes[0];
                const hqSort = b.sortCodes.find((s) => s.type === "head-office");
                return (
                  <tr key={`${b.slug}-sort`} className="align-middle">
                    <td className="px-3 py-2.5">
                      <Link href={`/codes/banks/${b.slug}`} className="font-semibold text-primary hover:underline">
                        {b.name}
                      </Link>
                      {b.fullLegalName ? (
                        <span className="ml-1.5 text-xs text-muted-foreground">({b.fullLegalName})</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tabular-nums">{nip.code}</span>
                        <CopyButton text={nip.code} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono tabular-nums text-muted-foreground">
                      {hqSort ? (
                        <div className="flex items-center gap-2">
                          <span>{hqSort.code}</span>
                          <CopyButton text={hqSort.code} />
                        </div>
                      ) : (
                        "unverified"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {b.headquartersLinks?.postalHref ? (
                        <Link
                          href={b.headquartersLinks.postalHref}
                          className="underline-offset-2 hover:text-primary hover:underline"
                        >
                          {b.headquartersCity ?? "Lagos"}
                        </Link>
                      ) : (
                        b.headquartersCity ?? "unverified"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="sources" aria-labelledby="sources-h" className="space-y-3 rounded-xl border bg-card/40 p-4 text-sm">
        <h2 id="sources-h" className="text-base font-bold">
          Sources, inclusion scope &amp; verification notes
        </h2>
        {BANKS_FILE_SCOPE ? <p className="text-xs leading-relaxed text-muted-foreground">{BANKS_FILE_SCOPE}</p> : null}
        <p className="text-xs leading-relaxed text-muted-foreground">
          Each bank profile links directly to primary official pages (the bank’s own USSD guide and corporate
          head-office contact/filings plus the Central Bank of Nigeria’s published Deposit Money Banks roster) alongside
          labelled secondary code compilations used to cross-check 3-digit NIP and 9-digit head-office clearing prefixes.
          A ₦6.98 telco USSD session fee applies per financial USSD session under CBN/NCC rules. NaijaCheck is an
          independent reference — no CBN or bank endorsement is claimed.
        </p>
        {hubSources.length > 0 ? (
          <ul className="space-y-1.5 text-xs sm:text-sm">
            {hubSources.map((s) => (
              <li key={s.url} className="flex flex-wrap items-baseline gap-2">
                <Badge variant={s.kind === "primary" ? "accent" : "outline"} className="text-[10px]">
                  {s.kind === "primary" ? "Official / primary" : "Secondary cross-check"}
                </Badge>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="related" aria-labelledby="related-h" className="space-y-2">
        <h2 id="related-h" className="text-base font-bold">
          Related references on NaijaCheck
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <li>
            <Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">
              Codes hub
            </Link>
          </li>
          <li>
            <Link href="/codes/postal" className="font-semibold text-primary underline-offset-2 hover:underline">
              Nigerian postal / ZIP codes
            </Link>
          </li>
          <li>
            <Link href="/codes/postal/lagos/victoria-island" className="font-semibold text-primary underline-offset-2 hover:underline">
              Victoria Island postal code (101241)
            </Link>
          </li>
          <li>
            <Link href="/geo/lagos" className="font-semibold text-primary underline-offset-2 hover:underline">
              Lagos State 20 LGAs
            </Link>
          </li>
          <li>
            <Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">
              FX rates &amp; CBN NFEM archive
            </Link>
          </li>
          <li>
            <Link href="/status" className="font-semibold text-primary underline-offset-2 hover:underline">
              Data status &amp; source health
            </Link>
          </li>
        </ul>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema("/codes/banks", "Commercial banks"),
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "List of commercial banks in Nigeria — sort codes, USSD & headquarters",
            description:
              "Directory of 12 major retail commercial banks in Nigeria with 3-digit CBN/NIP sort codes, primary USSD codes, corporate headquarters, CBN authorisation tiers and verified sources.",
            url: absUrl("/codes/banks"),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: updatedAt,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: banks.length,
              itemListElement: banks.map((b, idx) => ({
                "@type": "ListItem",
                position: idx + 1,
                name: b.fullLegalName ? `${b.name} (${b.fullLegalName})` : b.name,
                url: absUrl(`/codes/banks/${b.slug}`),
              })),
            },
          },
        ]}
      />
    </div>
  );
}
