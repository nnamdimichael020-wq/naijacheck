import type { Metadata } from "next";
import Link from "next/link";
import { QuizExperience } from "@/components/quiz/quiz-experience";
import { ShareControls } from "@/components/share-controls";
import { SITE_CONFIG } from "@/config/site";

export const metadata: Metadata = {
  title: "NaijaCheck Quizzes: Price IQ and Slang Check",
  description: "Play two short Nigerian quizzes built from NaijaCheck's dated FX, fuel and slang data. See sources and learn-more links after every answer.",
  alternates: { canonical: `${SITE_CONFIG.url}/tools/quiz` },
  openGraph: {
    title: "NaijaCheck Quizzes: Price IQ and Slang Check",
    description: "Test your knowledge with sourced Nigerian price and slang questions.",
    url: `${SITE_CONFIG.url}/tools/quiz`,
    type: "website",
  },
};

export default function QuizHubPage() {
  return (
    <article className="mx-auto max-w-4xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground"><Link href="/tools" className="hover:text-foreground">Tools</Link><span aria-hidden="true"> / </span><span aria-current="page">Quizzes</span></nav>
      <header className="mb-7 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Real data. Local knowledge.</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">NaijaCheck quizzes</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">No world-trivia filler and no email leaderboard. Pick one of two short quizzes made from the data we already publish: dated naira, FX and fuel references, or words from our Nigerian slang desk. After every answer, check the fact, source, date and a link to the full page.</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Rates and fuel figures are source-reported snapshots, not live offers or guarantees. Slang meanings are editorial explanations of usage and can vary by context. Scoring runs in your browser; an optional best score stays on this device only. No account or email is needed.</p>
      </header>
      <QuizExperience />
      <section className="mt-8 rounded-xl border p-5 text-sm leading-6 text-muted-foreground">
        <h2 className="font-bold text-foreground">How these quizzes work</h2>
        <p className="mt-2">Price IQ uses the dated exchange-rate and fuel snapshots shown in our <Link className="font-semibold text-primary underline underline-offset-2" href="/prices">prices</Link> and <Link className="font-semibold text-primary underline underline-offset-2" href="/prices/fuel">fuel</Link> pages. Slang Check draws from existing entries in <Link className="font-semibold text-primary underline underline-offset-2" href="/trends">Trends</Link>. The score is a simple count of correct answers; it is not a percentile or comparison with other people.</p>
      </section>
      <ShareControls title="NaijaCheck quizzes: Price IQ and Slang Check" url={`${SITE_CONFIG.url}/tools/quiz`} summary="sourced Nigerian price and slang quizzes" placement="footer" />
    </article>
  );
}
