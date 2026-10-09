import { ArticleView } from "@/components/article-view";
import { FuelTables } from "@/components/prices/price-tables";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/prices/fuel");
export const metadata = articleMetadata(article);

export default function FuelPage() {
  return (
    <ArticleView article={article}>
      <section aria-labelledby="fuel-tables" className="space-y-3">
        <h2 id="fuel-tables" className="text-2xl font-bold tracking-tight">
          The fuel numbers
        </h2>
        <FuelTables />
      </section>
    </ArticleView>
  );
}
