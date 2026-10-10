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
          Dated staple estimates with explicit city rows
        </h2>
        <p className="text-sm text-muted-foreground">These are unverified planning estimates, not live quotes or NBS survey values. Cities without explicit observations are not inferred.</p>
        <CityPriceTable />
      </section>
    </ArticleView>
  );
}
