import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Link as LinkIcon } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Article } from "@/lib/types";
import { articleSchema, absUrl } from "@/lib/seo";
import { DATA_DATE } from "@/lib/data";
import { ShareControls } from "@/components/share-controls";

const SECTION_HUB: Record<string, { label: string; href: string }> = {
  prices: { label: "Prices", href: "/prices" },
  "prices-city": { label: "Prices", href: "/prices" },
  "prices-item": { label: "Prices", href: "/prices" },
  "prices-market": { label: "Markets", href: "/prices/markets" },
  "prices-static": { label: "Prices", href: "/prices" },
  "trends-slang": { label: "Trends", href: "/trends" },
  "trends-psych": { label: "Trends", href: "/trends" },
  "hustle-blueprint": { label: "Hustle", href: "/hustle" },
  "hustle-combo": { label: "Hustle", href: "/hustle" },
  howto: { label: "GovHowTo", href: "/howto" },
  exam: { label: "Exam Hub", href: "/exam" },
  telecom: { label: "Telecom", href: "/telecom" },
  cookbook: { label: "Tools", href: "/tools/cookbook" },
  tools: { label: "Tools", href: "/tools" },
  learn: { label: "Learn", href: "/learn" },
};

/**
 * Renders one generated long-form page: H1, intro, takeaways, sections, FAQs and related links.
 * `children` renders interactive widgets (calculators, forms) between the intro and the body.
 */
export function ArticleView({ article, children, showSchema = true }: { article: Article; children?: React.ReactNode; showSchema?: boolean }) {
  const hub = SECTION_HUB[article.section] ?? { label: "Guides", href: "/" };
  const midpoint = Math.floor(article.sections.length / 2);
  const readMins = Math.max(2, Math.round(article.wordCount / 220));
  const disclosure = article.section.startsWith("prices") || article.section === "cookbook"
    ? `Manual/indicative planning data dated ${article.updatedAt}; not an automatically verified city-market feed. Confirm locally before paying.`
    : article.section === "telecom"
      ? `Manual/indicative bundle comparison dated ${article.updatedAt}; confirm price, validity and coverage in the operator's official app or USSD menu.`
      : article.section === "exam"
        ? `Manual guidance dated ${article.updatedAt}. Fees, dates and cut-offs are not auto-updated and must be confirmed on JAMB or the institution's official portal.`
        : article.section.startsWith("hustle")
          ? `Editorial planning model dated ${article.updatedAt}. Costs and timelines are estimates, not measured profit or a business guarantee.`
          : article.section.startsWith("trends")
            ? `Editorial meaning dated ${article.updatedAt}. Any editorial score is not a measurement of X or TikTok activity.`
            : article.section === "howto"
              ? `Manually reviewed guidance dated ${article.updatedAt}; official requirements can change and the linked agency must be checked before payment.`
              : null;

  return (
    <article className="max-w-3xl">
      {showSchema ? <JsonLd data={articleSchema(article)} /> : null}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: hub.label, href: hub.href },
          { label: article.navLabel },
        ]}
      />

      <header>
        <Badge variant="accent" className="mb-3">
          {article.kicker}
        </Badge>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{article.title}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" aria-hidden="true" /> About {readMins} min read
          </span>
          <span>Updated {DATA_DATE}</span>
        </p>
        <ShareControls
          placement="inline"
          title={article.title}
          url={absUrl(article.path)}
          summary={`as of ${article.updatedAt}`}
        />
      </header>

      {disclosure ? (
        <p className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <strong>Verification status:</strong> {disclosure}
        </p>
      ) : null}

      <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-foreground/90">
        {article.intro.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <Card className="mt-6 border-primary/40 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick take</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {article.takeaways.map((t, i) => (
              <li key={i} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <AdSlot variant="in-content" index={0} />

      {children ? <div className="my-8">{children}</div> : null}

      <div className="prose-naija">
        {article.sections.map((s, i) => (
          <React.Fragment key={s.h2}>
            <section aria-labelledby={`h-${i}`}>
              <h2 id={`h-${i}`}>{s.h2}</h2>
              {s.paras.map((p, j) => (
                <p key={j} className="mt-4 leading-relaxed text-foreground/90">
                  {p}
                </p>
              ))}
              {s.bullets?.length ? (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-foreground/90 marker:text-primary">
                  {s.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
            {i === midpoint && article.sections.length > 2 ? <AdSlot variant="in-content" index={1} /> : null}
          </React.Fragment>
        ))}
      </div>

      {article.steps?.length ? (
        <section className="mt-10" aria-labelledby="steps">
          <h2 id="steps" className="text-2xl font-bold tracking-tight">
            Step by step
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-6 marker:font-semibold marker:text-primary">
            {article.steps.map((s, i) => (
              <li key={i} className="leading-relaxed">
                {s}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {article.faqs.length ? (
        <section className="mt-10" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold tracking-tight">
            Questions people ask
          </h2>
          <div className="mt-4 divide-y rounded-lg border">
            {article.faqs.map((f, i) => (
              <details key={i} className="group p-4" open={i === 0}>
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span aria-hidden="true" className="text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10" aria-labelledby="keep-reading">
        <h2 id="keep-reading" className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <LinkIcon className="size-5 text-primary" aria-hidden="true" /> Keep reading
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {article.links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="block rounded-lg border p-3 text-sm font-medium hover:border-primary hover:bg-secondary">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 rounded-md bg-secondary p-3 text-xs text-muted-foreground">
        Figures on this page are indicative for {DATA_DATE} unless a source is named. This is general information, not financial, legal or medical
        advice. Check the official source before you pay or decide.
      </p>
      <ShareControls title={article.title} url={absUrl(article.path)} summary={`as of ${article.updatedAt}`} />
      <AdSlot variant="inline" index={2} />
    </article>
  );
}
