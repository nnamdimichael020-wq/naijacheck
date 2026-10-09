import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { LEARN_TOPICS } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/learn");
export const metadata = articleMetadata(article);

export default function LearnPage() {
  return (
    <ArticleView article={article}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {LEARN_TOPICS.map((t) => (
          <li key={t.slug}>
            <Link href={`/learn/${t.slug}`} className="block rounded-lg border p-4 hover:border-primary hover:bg-secondary">
              <span className="block font-semibold">{t.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{t.angle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ArticleView>
  );
}
