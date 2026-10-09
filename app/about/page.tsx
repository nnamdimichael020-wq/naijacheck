import type { Metadata } from "next";
import { SITE_CONFIG, SITE_TAGLINE, SOCIAL_HANDLE } from "@/config/site";
import { DATA_DATE } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/about",
  title: `About ${SITE_CONFIG.name}`,
  description: `What ${SITE_CONFIG.name} is, how we source prices and slang, what we will not do, and how to correct us.`,
});

export default function AboutPage() {
  return (
    <article className="max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">About</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
          {SITE_CONFIG.name}: {SITE_TAGLINE}
        </h1>
      </header>
      <div className="space-y-4 text-[17px] leading-relaxed text-foreground/90">
        <p>
          {SITE_CONFIG.name} ({SITE_CONFIG.domain}) is a daily utility site for Nigerians. We answer the everyday questions: what rice costs in your city, what
          a word means in the group chat, how to start a small business with the money you actually have, which government form to file and what it costs, and
          how to plan your power and data budget.
        </p>
        <p>
          We are built for traders, Gen Z, side-hustlers, professionals and students. The writing is meant to be sharp and plain. If a sentence sounds like a
          bank brochure, we will rewrite it.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">How we handle numbers</h2>
        <ul className="list-disc space-y-2 pl-5 text-foreground/90">
          <li>FX, fuel depot prices, news headlines and trend counts are read from their sources every three hours by an automated monitor, and each figure shows when it was read.</li>
          <li>A source that fails or changes layout keeps its last confirmed value and is marked stale. We do not guess. Live health for every source is on the status page.</li>
          <li>Trend counts come from Nigerian news and Wikipedia pageviews. We do not read X or TikTok.</li>
          <li>Food prices, pump prices and telecom bundle prices are not auto-read yet. They carry their survey or check date.</li>
          <li>Ranges beat false precision. Confirm before you spend.</li>
        </ul>
        <p className="text-sm text-muted-foreground">Figures on this site were last reviewed on {DATA_DATE}.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">What we will not do</h2>
        <ul className="list-disc space-y-2 pl-5 text-foreground/90">
          <li>No pop-ups, interstitials, autoplay video or ads that cover the page.</li>
          <li>No selling your personal data. Calculator inputs stay in your browser.</li>
          <li>No pretending a blueprint is a guarantee. Every hustle plan has failure points, and we list them.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Corrections and feedback</h2>
        <p className="text-foreground/90">
          Spotted a wrong price, a fee that has changed, or a slang meaning that is off in your city? Tell us on {SOCIAL_HANDLE} with the page link and a
          source. We update the data files and publish the fix on the next build.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Disclaimer</h2>
        <p className="text-sm text-muted-foreground">
          NaijaCheck gives general information. It is not financial, legal, tax or medical advice. For those, speak to a qualified professional. Check official
          sources before you pay any government fee.
        </p>
      </section>
    </article>
  );
}
