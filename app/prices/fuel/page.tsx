import { ArticleView } from "@/components/article-view";
import { FuelTables } from "@/components/prices/price-tables";
import { FuelHistorySection, LpgHistorySection } from "@/components/live/history-section";
import { MAX_HISTORY_POINTS_PER_DATASET } from "@/lib/live";
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

      <section aria-labelledby="fuel-history" className="space-y-3">
        <h2 id="fuel-history" className="text-2xl font-bold tracking-tight">
          Depot median history
        </h2>
        <p className="text-sm text-muted-foreground">
          These charts plot only the wholesale depot readings the monitor actually recorded — up to the last{" "}
          {MAX_HISTORY_POINTS_PER_DATASET} observations per dataset. A dataset with fewer than two stored readings shows an
          empty state rather than a drawn line, and gaps on the time axis are real gaps. Depot medians are wholesale
          gantry prices, not station pump prices.
        </p>
        <div className="grid gap-3 lg:grid-cols-2">
          <FuelHistorySection />
          <LpgHistorySection />
        </div>
      </section>
    </ArticleView>
  );
}
