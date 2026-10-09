import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { TELECOM } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/telecom");
export const metadata = articleMetadata(article);

export default function TelecomPage() {
  return (
    <ArticleView article={article}>
      <section aria-labelledby="networks" className="space-y-3">
        <h2 id="networks" className="text-2xl font-bold tracking-tight">
          The four networks
        </h2>
        <p className="text-sm text-muted-foreground">Status: {TELECOM.status}. {TELECOM.source}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TELECOM.networks.map((n) => (
            <li key={n.slug}>
              <Link href={`/telecom/${n.slug}`} className="block rounded-lg border p-4 hover:border-primary hover:bg-secondary">
                <span className="block font-semibold">{n.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{n.coverage}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ArticleView>
  );
}
