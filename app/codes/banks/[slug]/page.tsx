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
import {
  bankLicenceTierShort,
  getAllBanks,
  getAllBankSlugs,
  getBankBySlug,
  type Bank,
} from "@/lib/banks";

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllBankSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const bank = getBankBySlug(slug);
  if (!bank) return { title: "Not found" };
  const nip = bank.sortCodes.find((s) => s.type === "nip")?.code ?? bank.sortCodes[0]?.code ?? "";
  const ussd = bank.ussd[0]?.code ?? "";
  const title = `${bank.name} sort code (${nip}), USSD (${ussd}) & headquarters`;
  const legalPart = bank.fullLegalName && bank.fullLegalName !== bank.name ? ` (${bank.fullLegalName})` : "";
  const hqPart = bank.headquartersCity ? `, ${bank.headquartersCity} headquarters` : "";
  const licencePart = bank.licenceType ? `, ${bank.licenceType.toLowerCase()}` : "";
  const description = `${bank.name}${legalPart}: 3-digit CBN/NIP sort code ${nip}, primary USSD ${ussd} (${bank.ussd.length} verified shortcuts)${hqPart}${licencePart} — copy buttons & cited sources (${bank.lastVerified}).`;

  return pageMetadata({
    path: `/codes/banks/${bank.slug}`,
    title,
    description,
    keywords: [
      `${bank.name} sort code`,
      `${bank.name} USSD code`,
      `${bank.name} headquarters`,
      ...(bank.fullLegalName ? [bank.fullLegalName] : []),
      `${bank.name} bank code Nigeria`,
      `Nigeria ${bank.name} code`,
    ],
  });
}

function peerBanks(current: Bank, count = 6): Bank[] {
  const all = getAllBanks().filter((b) => b.slug !== current.slug);
  const currentTier = bankLicenceTierShort(current.licenceType);
  const sameTier = all.filter((b) => bankLicenceTierShort(b.licenceType) === currentTier);
  const otherTier = all.filter((b) => bankLicenceTierShort(b.licenceType) !== currentTier);
  return [...sameTier, ...otherTier].slice(0, count);
}

function buildBankFaqs(bank: Bank): { q: string; a: string }[] {
  const nipCode = bank.sortCodes.find((s) => s.type === "nip")?.code ?? bank.sortCodes[0]?.code;
  const headCode = bank.sortCodes.find((s) => s.type === "head-office")?.code;
  const mainUssd = bank.ussd[0]?.code ?? "";

  const faqs: { q: string; a: string }[] = [
    {
      q: `What is the sort code for ${bank.name}?`,
      a: `The 3-digit NIP/CBN bank code commonly called the sort code for ${bank.name} is ${nipCode ?? bank.sortCodes.map((s) => s.code).join(", ")}. ${
        headCode
          ? `A cited 9-digit head-office cheque-clearing code is ${headCode} (its first 3 digits match ${nipCode ?? headCode.slice(0, 3)}). `
          : ""
      }Use ${nipCode} when selecting ${bank.name} for instant NUBAN transfers; individual branches can carry distinct 9-digit cheque clearing numbers, so confirm branch-specific numbers in the bank’s official app or branch.`,
    },
    {
      q: `What is the USSD code for ${bank.name}?`,
      a: `The primary USSD code for ${bank.name} is ${mainUssd}. Dial it from the mobile phone number linked to your ${bank.name} account on MTN, Airtel, Glo or 9mobile — no mobile data is required. A ₦6.98 telco USSD session fee applies per financial transaction under CBN/NCC rules, and menu prompts can be updated by the bank.`,
    },
  ];

  if (bank.headquarters || bank.licenceType) {
    const hqSentence = bank.headquarters
      ? `${bank.fullLegalName ?? bank.name} lists its corporate head office at ${bank.headquarters}.`
      : `Corporate headquarters street address is currently marked unverified in our dataset.`;
    const licenceSentence = bank.licenceType
      ? ` On the Central Bank of Nigeria’s Deposit Money Banks register, it holds a ${bank.licenceType} licence${
          bank.parentGroup ? ` (under ${bank.parentGroup})` : ""
        }.`
      : "";
    faqs.push({
      q: `Where is ${bank.name}’s headquarters and what CBN licence does it hold?`,
      a: `${hqSentence}${licenceSentence}`,
    });
  }

  faqs.push({
    q: `Why do some blogs show different ${bank.name} USSD shortcuts or branch codes?`,
    a: `The 3-digit NIP code (${nipCode}) is bank-wide, while 9-digit cheque sort codes vary by branch and USSD sub-menus are periodically updated by ${bank.name}. We list only codes backed by cited official bank pages or labelled NIBSS/CBN compilations, manually checked on ${bank.lastVerified}. NaijaCheck is an independent reference and not endorsed by the CBN or ${bank.name}.`,
  });

  return faqs;
}

export default async function BankPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bank = getBankBySlug(slug);
  if (!bank) notFound();

  const nip = bank.sortCodes.find((s) => s.type === "nip") ?? bank.sortCodes[0];
  const headOffice = bank.sortCodes.find((s) => s.type === "head-office");
  const mainUssd = bank.ussd[0];
  const tierShort = bankLicenceTierShort(bank.licenceType);
  const related = peerBanks(bank);
  const path = `/codes/banks/${bank.slug}`;
  const faqs = buildBankFaqs(bank);

  const organizationLd: Record<string, unknown> = {
    "@type": "Organization",
    name: bank.name,
    ...(bank.fullLegalName ? { legalName: bank.fullLegalName } : {}),
    ...(bank.officialWebsite ? { url: bank.officialWebsite } : {}),
    ...(bank.parentGroup ? { parentOrganization: { "@type": "Organization", name: bank.parentGroup } } : {}),
    ...(bank.headquarters
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: bank.headquarters,
            addressLocality: bank.headquartersCity ?? "Lagos",
            addressRegion: "Lagos",
            addressCountry: "NG",
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Nigerian codes", href: "/codes" },
          { label: "Commercial banks", href: "/codes/banks" },
          { label: bank.name, href: path },
        ]}
      />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">
            CBN code {nip.code} · USSD {mainUssd.code}
          </Badge>
          <Badge variant="outline">
            {tierShort === "Unverified" ? "Licence unverified" : `${tierShort} CBN licence`}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground">Manually verified {bank.lastVerified}</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {bank.name} sort code, USSD &amp; headquarters
          {bank.fullLegalName ? (
            <span className="block pt-1 text-base font-medium tracking-normal text-muted-foreground">
              {bank.fullLegalName}
              {bank.parentGroup ? ` · ${bank.parentGroup}` : ""}
            </span>
          ) : null}
        </h1>

        <ShareControls
          placement="inline"
          title={`${bank.name} sort code (${nip.code}), USSD (${mainUssd.code}) & headquarters`}
          url={absUrl(path)}
          summary={`${bank.name} (${bank.fullLegalName ?? bank.name}): sort code ${nip.code}, USSD ${mainUssd.code}${bank.headquartersCity ? `, HQ ${bank.headquartersCity}` : ""} — verified ${bank.lastVerified}`}
        />
      </header>

      <section aria-labelledby="key-facts" className="space-y-3">
        <Card className="border-primary/25">
          <CardHeader className="pb-3">
            <CardTitle id="key-facts" className="text-base font-bold">
              Key reference facts — {bank.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  3-digit CBN / NIP sort code
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xl font-extrabold tabular-nums">{nip.code}</span>
                    <p className="text-xs text-muted-foreground">Bank-wide code for NUBAN transfers</p>
                  </div>
                  <CopyButton text={nip.code} />
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Primary USSD code
                </dt>
                <dd className="mt-1 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xl font-extrabold">{mainUssd.code}</span>
                    <p className="text-xs text-muted-foreground">{mainUssd.label}</p>
                  </div>
                  <CopyButton text={mainUssd.code} />
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Official legal name
                </dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {bank.fullLegalName ?? bank.fullName ?? "unverified"}
                  {bank.parentGroup ? (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      Holding / parent group: {bank.parentGroup}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  CBN licence category
                </dt>
                <dd className="mt-1 font-semibold text-foreground">{bank.licenceType ?? "unverified"}</dd>
              </div>

              <div className="rounded-lg border bg-card/40 p-3 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Corporate headquarters
                </dt>
                <dd className="mt-1 space-y-1.5">
                  <p className="font-medium text-foreground">{bank.headquarters ?? "unverified"}</p>
                  {bank.headquartersLinks ? (
                    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Location references:</span>
                      {bank.headquartersLinks.postalHref ? (
                        <Link
                          href={bank.headquartersLinks.postalHref}
                          className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          {bank.headquartersLinks.postalLabel ?? "District postal codes"}
                        </Link>
                      ) : null}
                      {bank.headquartersLinks.geoHref ? (
                        <Link
                          href={bank.headquartersLinks.geoHref}
                          className="font-semibold text-primary underline-offset-2 hover:underline"
                        >
                          {bank.headquartersLinks.geoLabel ?? "Local Government Area"}
                        </Link>
                      ) : null}
                    </p>
                  ) : null}
                </dd>
              </div>
            </dl>

            {bank.statusNote ? (
              <div className="rounded-lg border bg-secondary/25 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Institutional &amp; status note:</strong> {bank.statusNote}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Last verified <strong className="font-mono text-foreground">{bank.lastVerified}</strong> ·{" "}
                {bank.sources.filter((s) => s.kind === "primary").length} primary +{" "}
                {bank.sources.filter((s) => s.kind !== "primary").length} secondary cited sources below.
              </span>
              {bank.officialWebsite ? (
                <a
                  href={bank.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  Official {bank.name} website ↗
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="sort-codes" className="space-y-3">
        <h2 id="sort-codes" className="text-xl font-bold">
          Sort codes — {bank.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          The 3-digit <strong>NIP/CBN bank code</strong> ({nip.code}) routes instant electronic transfers to{" "}
          {bank.name}. Where sourced, we also list the 9-digit head-office cheque-clearing sort code as an example
          (individual branches can carry different last-six digits).
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Bank identification &amp; clearing codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bank.sortCodes.map((s) => (
              <div
                key={s.code}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3"
              >
                <div>
                  <p className="font-mono text-lg font-extrabold tabular-nums">{s.code}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <CopyButton text={s.code} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Last verified {bank.lastVerified} · verification: {bank.verification} · every code cites a public source
              below.
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="ussd-codes" className="space-y-3">
        <h2 id="ussd-codes" className="text-xl font-bold">
          USSD shortcuts — {bank.name} ({mainUssd.code})
        </h2>
        <p className="text-sm text-muted-foreground">
          Dial on the mobile line registered with {bank.name} (MTN, Airtel, Glo or 9mobile). Replace{" "}
          <code>Amount</code>, <code>AccountNumber</code> and <code>PhoneNumber</code> with actual digits. A ₦6.98
          telco USSD session fee applies per financial transaction under CBN/NCC rules.
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Verified USSD strings ({bank.ussd.length} listed)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bank.ussd.map((u) => (
              <div
                key={u.code}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold">{u.code}</p>
                  <p className="font-semibold">{u.label}</p>
                  {u.purpose ? <p className="text-xs text-muted-foreground">{u.purpose}</p> : null}
                </div>
                <CopyButton text={u.code} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Only strings backed by a cited source below are shown. If a sub-shortcut changes, dial{" "}
              <code>{mainUssd.code}</code> directly and follow the interactive menu.
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="sources" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="sources" className="text-base font-bold">
          Sources &amp; how {bank.name} was verified
        </h2>
        <p className="text-xs text-muted-foreground">
          Primary sources are {bank.name}’s official pages and the Central Bank of Nigeria’s published Deposit Money
          Banks list; secondary compilations cross-check 3-digit NIP and 9-digit head-office cheque prefixes. Manually
          verified {bank.lastVerified}. If any detail changes, {bank.name}’s official channel is authoritative.
        </p>
        <ul className="space-y-2 text-sm">
          {bank.sources.map((s) => (
            <li key={s.url} className="flex flex-wrap items-baseline gap-2">
              <Badge variant={s.kind === "primary" ? "accent" : "outline"} className="text-[10px]">
                {s.kind === "primary" ? "Official / primary" : "Secondary compilation"}
              </Badge>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {s.label}
              </a>
              <span className="break-all text-xs text-muted-foreground">{s.url}</span>
            </li>
          ))}
        </ul>
      </section>

      {bank.notes ? (
        <section aria-labelledby="notes" className="space-y-2 rounded-xl border bg-secondary/30 p-4 text-sm">
          <h2 id="notes" className="text-sm font-bold">
            Operational notes — {bank.name}
          </h2>
          <p className="text-muted-foreground">{bank.notes}</p>
          <p className="text-xs text-muted-foreground">
            Independent reference — no CBN or {bank.name} endorsement implied. Codes and daily transfer tiers can
            change after {bank.lastVerified}; confirm critical actions in the official app or branch.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <h2 id="faq" className="text-lg font-bold">
          Frequently asked questions — {bank.name}
        </h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="related" className="space-y-3">
        <h2 id="related" className="text-base font-bold">
          Compare other Nigerian commercial banks
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {related.map((b) => {
            const bNip = b.sortCodes.find((s) => s.type === "nip")?.code ?? b.sortCodes[0].code;
            return (
              <li key={b.slug}>
                <Link
                  href={`/codes/banks/${b.slug}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary"
                >
                  <div>
                    <span className="font-semibold">{b.name}</span>
                    {b.headquartersCity ? (
                      <span className="block text-xs text-muted-foreground">{b.headquartersCity}</span>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {bNip} · {b.ussd[0].code} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          <Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">
            All {getAllBanks().length} commercial banks →
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">
            Codes hub
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/codes/postal" className="font-semibold text-primary underline-offset-2 hover:underline">
            Postal / ZIP codes
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">
            FX rates
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/status" className="font-semibold text-primary underline-offset-2 hover:underline">
            Source status
          </Link>
        </p>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema(path, bank.name),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${bank.name} sort code (${nip.code}), USSD (${mainUssd.code}) & headquarters`,
            description: `${bank.name} (${bank.fullLegalName ?? bank.name}): sort code ${nip.code}, primary USSD ${mainUssd.code}${headOffice ? `, head-office sort example ${headOffice.code}` : ""}${bank.headquarters ? `, headquarters at ${bank.headquarters}` : ""}.`,
            url: absUrl(path),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: bank.lastVerified,
            about: organizationLd,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
    </div>
  );
}
