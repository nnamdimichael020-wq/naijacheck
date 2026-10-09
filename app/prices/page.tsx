import { ArticleView } from "@/components/article-view";
import { CityPriceTable } from "@/components/prices/price-tables";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/prices");
export const metadata = articleMetadata(article);

export default function PricesPage() {
  return (
    <ArticleView article={article}>
      <section aria-labelledby="city-table" className="space-y-3">
        <h2 id="city-table" className="text-2xl font-bold tracking-tight">
          Staples in all 10 cities
        </h2>
        <p className="text-sm text-muted-foreground">Pick a city for all 17 items, or open a staple for a city-by-city ranking.</p>
        <CityPriceTable />
      </section>
    </ArticleView>
  );
}
