import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { MARKETS, CITY_BY_SLUG, DIRECT_PRICE_CITIES } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/prices/markets");
export const metadata = articleMetadata(article);

export default function MarketsPage() {
  return (
    <ArticleView article={article}>
      <section aria-labelledby="market-list" className="space-y-3">
        <h2 id="market-list" className="text-2xl font-bold tracking-tight">
          Market guides
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MARKETS.filter((market) => DIRECT_PRICE_CITIES.some((city) => city.slug === market.city)).map((m) => (
            <li key={m.slug}>
              <Link href={`/prices/markets/${m.slug}`} className="block rounded-lg border p-4 hover:border-primary hover:bg-secondary">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CITY_BY_SLUG[m.city].name}</span>
                <span className="mt-1 block font-semibold">{m.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{m.known_for}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ArticleView>
  );
}
