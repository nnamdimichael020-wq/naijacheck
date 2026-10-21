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
import { getAllBanks, getAllBankSlugs, getBankBySlug } from "@/lib/banks";

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
  // Unique intent targeting: “GTBank sort code” / “Access Bank USSD code” etc.
  const title = `${bank.name} sort code & USSD code — ${nip ? `${nip}` : ""}${nip && ussd ? " • " : ""}${ussd} | NaijaCheck`;
  const description =
    bank.slug === "gtbank"
      ? `GTBank (Guaranty Trust Bank) sort code 058 & USSD code *737# — every GTB transfer, balance, airtime and block shortcut with copy button, notes, source links and last-verified ${bank.lastVerified}.`
      : bank.slug === "access-bank"
      ? `Access Bank sort code 044 & USSD code *901# — every Access transfer, balance, airtime and *901*911# block shortcut with copy, sources and last-verified ${bank.lastVerified}.`
      : bank.slug === "zenith-bank"
      ? `Zenith Bank sort code 057 & USSD code *966# — every Zenith EazyBanking shortcut (transfer, *966*00#, *966*911#) with copy, sources and last-verified ${bank.lastVerified}.`
      : bank.slug === "first-bank"
      ? `First Bank sort code 011 & USSD *894# — every FirstBank 894 Banking shortcut (transfer, *894*00# balance, *894*911# block) with copy, sources and verified ${bank.lastVerified}.`
      : `${bank.name}${bank.fullName ? ` (${bank.fullName})` : ""} sort code ${nip ? `${nip}` : bank.sortCodes.map((s) => s.code).join(", ")} & USSD ${ussd} — transfers, balance, airtime, block codes with copy button, last-verified ${bank.lastVerified} and documented sources.`;
  return pageMetadata({
    path: `/codes/banks/${bank.slug}`,
    title,
    description,
    keywords: [
      `${bank.name} sort code`,
      `${bank.name} USSD code`,
      `${bank.name} bank code Nigeria`,
      `${bank.name} USSD *${bank.ussd[0]?.code.replace(/\*/g, "").replace(/#/g, "")}`,
      `Nigeria ${bank.name} code`,
    ],
  });
}

function otherBanks(currentSlug: string, count = 6) {
  return getAllBanks()
    .filter((b) => b.slug !== currentSlug)
    .slice(0, count);
}

function Faq({ bank }: { bank: ReturnType<typeof getBankBySlug> }) {
  if (!bank) return null;
  const nipCode = bank.sortCodes.find((s) => s.type === "nip")?.code ?? bank.sortCodes[0]?.code;
  const headCode = bank.sortCodes.find((s) => s.type === "head-office")?.code;
  const mainUssd = bank.ussd[0]?.code ?? "";
  const faqs: { q: string; a: string }[] = [
    {
      q: `What is the sort code for ${bank.name}?`,
      a: `The NIP/CBN bank code commonly called the sort code for ${bank.name} is ${nipCode ?? bank.sortCodes.map((s) => s.code).join(", ")}. ${headCode ? `Some cheques show a 9-digit head-office code ${headCode} — its first 3 digits are ${nipCode ?? headCode.slice(0, 3)}.` : ""} This is the code used to identify ${bank.name} in NUBAN instant transfers. Verify the branch code in your official app or with the branch — different branches can have their own 9-digit numbers.`,
    },
    {
      q: `What is the USSD code for ${bank.name}?`,
      a: `The main USSD code for ${bank.name} is ${mainUssd}. Dial it from the phone number linked to your ${bank.name} account — no internet or app needed. It works on MTN, Airtel, Glo and 9mobile. Other shortcuts (transfer, airtime, balance) are listed in the table above; exact syntax can change so confirm in the official app or branch.`,
    },
    {
      q: `Why do some sources show different ${bank.name} codes?`,
      a: `The 3-digit NIP code (${nipCode ?? "listed above"}) is stable — it identifies the bank. The 9-digit cheque “sort code” varies by head office/branch. USSD flows are updated by the bank; secondary blogs sometimes list outdated shortcuts. We keep only sourced codes and mark last-verified ${bank.lastVerified}. If anything looks wrong, open the source links below.`,
    },
    {
      q: `Can I trust these codes for transfers today?`,
      a: `We link every code to a documented source (official bank page where available + public NIBSS/CBN compilations) and show when it was last manually verified. Banks can change USSD menus — always double-check in the bank’s official app or by dialling the main code — and confirm amounts/names before confirming a transfer. NaijaCheck is independent and not a CBN endorsement.`,
    },
  ];
  return (
    <section aria-labelledby="faq" className="space-y-3 rounded-xl border bg-card/40 p-4">
      <h2 id="faq" className="text-lg font-bold">Frequently asked questions — {bank.name}</h2>
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

export default async function BankPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bank = getBankBySlug(slug);
  if (!bank) notFound();

  const nip = bank.sortCodes.find((s) => s.type === "nip");
  const headOffice = bank.sortCodes.find((s) => s.type === "head-office");
  const related = otherBanks(bank.slug);
  const path = `/codes/banks/${bank.slug}`;

  const faqEntries = [
    {
      q: `What is the sort code for ${bank.name}?`,
      a: `The NIP/CBN sort code for ${bank.name} is ${nip?.code ?? bank.sortCodes[0].code}${headOffice ? ` (head-office example ${headOffice.code})` : ""}.`,
    },
    {
      q: `What is the USSD code for ${bank.name}?`,
      a: `The main USSD code for ${bank.name} is ${bank.ussd[0].code}. Dial it from the phone linked to your account.`,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Nigerian codes", href: "/codes" }, { label: "Banks", href: "/codes/banks" }, { label: bank.name, href: path }]} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">CBN code {nip?.code ?? bank.sortCodes[0].code} · {bank.lastVerified}</Badge>
          <Badge variant="outline">Verified manually</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {bank.name} sort code & USSD code{bank.fullName ? <span className="text-base font-medium tracking-normal text-muted-foreground"> · {bank.fullName}</span> : null}
        </h1>
        <p className="text-muted-foreground">
          {bank.name}’s transfer sort code and USSD short codes — every row with a <strong>copy</strong> button. Sort codes identify the bank in{" "}
          <abbr title="Bank Verification Number / Nigeria Uniform Bank Account Number">NUBAN</abbr> transfers; USSD codes are what you dial on your phone. Both are sourced and dated so you can verify them.
        </p>
        <ShareControls
          placement="inline"
          title={`${bank.name} sort code & USSD code ${nip?.code ?? ""} ${bank.ussd[0].code}`}
          url={absUrl(path)}
          summary={`${bank.name}: sort code ${nip?.code ?? bank.sortCodes[0].code} & USSD ${bank.ussd[0].code} — every code sourced, verified ${bank.lastVerified}`}
        />
      </header>

      <section aria-labelledby="sort-codes" className="space-y-3">
        <h2 id="sort-codes" className="text-xl font-bold">Sort code — {bank.name}</h2>
        <p className="text-sm text-muted-foreground">
          The 3-digit <strong>NIP/CBN bank code</strong> is the “sort code” most Nigerians mean — it routes instant transfers to {bank.name}. A 9-digit head-office cheque code is shown where we have a cited source; it is an example only (branches differ).
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Bank identification codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bank.sortCodes.map((s) => (
              <div key={s.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3">
                <div>
                  <p className="font-mono text-lg font-extrabold tabular-nums">{s.code}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <CopyButton text={s.code} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Last verified {bank.lastVerified} · verification: manual · every code below cites its source.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="ussd-codes" className="space-y-3">
        <h2 id="ussd-codes" className="text-xl font-bold">USSD codes — {bank.name}</h2>
        <p className="text-sm text-muted-foreground">Dial these strings on the phone number linked to your {bank.name} account (any network). Replace <code>Amount</code>, <code>AccountNumber</code>, <code>PhoneNumber</code> with real values. ₦6.98 telco USSD session fee applies per financial transaction (all banks, CBN/NCC rule).</p>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">USSD shortcuts (only sourced rows)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {bank.ussd.map((u) => (
              <div key={u.code} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card/40 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-sm font-bold">{u.code}</p>
                  <p className="font-semibold">{u.label}</p>
                  {u.purpose ? <p className="text-xs text-muted-foreground">{u.purpose}</p> : null}
                </div>
                <CopyButton text={u.code} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Only codes that have a source link below are listed. If a purpose changed recently, dial {bank.ussd[0].code} and follow the on-screen menu — it always shows the current options.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="sources" className="space-y-2 rounded-xl border bg-card/40 p-4">
        <h2 id="sources" className="text-base font-bold">Sources & how this page is verified</h2>
        <p className="text-xs text-muted-foreground">Every code above appears in at least one source linked here. “Official” means the bank’s own site/app page listing the same USSD string; “compilation” means a public CBN/NIBSS list used industry-wide. Last verified {bank.lastVerified} — manual check of each source. If a code changes, the bank’s channel is authoritative.</p>
        <ul className="space-y-1 text-sm">
          {bank.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary underline-offset-2 hover:underline">
                {s.label}
              </a>
              <span className="ml-2 text-xs text-muted-foreground break-all">{s.url}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="notes" className="space-y-2 rounded-xl border bg-secondary/30 p-4 text-sm">
        <h2 id="notes" className="text-sm font-bold">Notes</h2>
        <p className="text-muted-foreground">{bank.notes}</p>
        <p className="text-xs text-muted-foreground">No CBN endorsement implied. NaijaCheck is an independent directory — codes can change after {bank.lastVerified}. Verify in the bank’s official app or by dialling the main USSD code.</p>
      </section>

      <Faq bank={bank} />

      <section aria-labelledby="related" className="space-y-2">
        <h2 id="related" className="text-base font-bold">Other banks</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {related.map((b) => (
            <li key={b.slug}>
              <Link href={`/codes/banks/${b.slug}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary">
                <span className="font-semibold">{b.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{b.sortCodes[0].code} · {b.ussd[0].code} →</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm">
          <Link href="/codes/banks" className="font-semibold text-primary underline-offset-2 hover:underline">See all {getAllBanks().length} banks →</Link>
          {" · "}
          <Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">Codes hub</Link>
        </p>
      </section>

      <JsonLd
        data={[
          breadcrumbSchema(path, bank.name),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${bank.name} sort code & USSD code — ${nip?.code ?? bank.sortCodes[0].code} • ${bank.ussd[0].code}`,
            description: `${bank.name} sort code ${nip?.code ?? bank.sortCodes[0].code} & USSD ${bank.ussd[0].code} — transfers, balance, airtime, block codes with sources.`,
            url: absUrl(path),
            inLanguage: "en-NG",
            isPartOf: { "@type": "WebSite", name: SITE_CONFIG.name, url: SITE_CONFIG.url },
            dateModified: bank.lastVerified,
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqEntries.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
    </div>
  );
}
