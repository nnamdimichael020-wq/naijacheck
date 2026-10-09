import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { GOV_DOCS } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/howto");
export const metadata = articleMetadata(article);

export default function HowToHubPage() {
  return (
    <ArticleView article={article}>
      <section aria-labelledby="guides" className="space-y-3">
        <h2 id="guides" className="text-2xl font-bold tracking-tight">
          All guides
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {GOV_DOCS.map((d) => (
            <li key={d.slug}>
              <Link href={`/howto/${d.slug}`} className="block rounded-lg border p-4 hover:border-primary hover:bg-secondary">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d.category}</span>
                <span className="mt-1 block font-semibold">{d.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">Fee: {d.fee.split(".")[0]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ArticleView>
  );
}
