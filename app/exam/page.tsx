import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { EXAM } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/exam");
export const metadata = articleMetadata(article);

export default function ExamHubPage() {
  return (
    <ArticleView article={article}>
      <section aria-labelledby="schools" className="space-y-3">
        <h2 id="schools" className="text-2xl font-bold tracking-tight">
          Schools we track
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXAM.institutions.map((i) => (
            <li key={i.slug}>
              <Link href={`/exam/jamb-cutoff-${i.slug}-2026`} className="block rounded-lg border p-4 hover:border-primary hover:bg-secondary">
                <span className="block font-semibold">{i.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">General cut-off: {i.general}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/exam/jamb-cutoff-2026" className="block rounded-lg border p-4 hover:border-primary hover:bg-secondary">
              <span className="block font-semibold">National JAMB minimum</span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Universities {EXAM.nationalCutOff.universities}, polytechnics {EXAM.nationalCutOff.polytechnics}
              </span>
            </Link>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">Cut-offs are reported figures that change by session. Confirm on each school&apos;s official portal before you pay.</p>
      </section>
    </ArticleView>
  );
}
