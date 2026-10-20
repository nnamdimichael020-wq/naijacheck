import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { FuelHistorySection } from "@/components/live/history-section";
import { MAX_HISTORY_POINTS_PER_DATASET } from "@/lib/live";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/prices/generator-diesel");
export const metadata = articleMetadata(article);

export default function GeneratorDieselPage() {
  return (
    <ArticleView article={article}>
      <section aria-labelledby="diesel-history" className="space-y-3">
        <h2 id="diesel-history" className="text-2xl font-bold tracking-tight">
          Depot diesel median history
        </h2>
        <p className="text-sm text-muted-foreground">
          Generator running cost follows the wholesale diesel (AGO) depot median, so this chart plots only the diesel readings
          the monitor actually recorded — up to the last {MAX_HISTORY_POINTS_PER_DATASET} observations. With fewer than two
          stored readings the chart stays empty instead of drawing a line, and no value between readings is estimated. Depot
          medians are wholesale gantry prices; add your station&apos;s pump price and delivery cost before budgeting.
        </p>
        <FuelHistorySection only={["fuel-depot-diesel"]} />
        <p className="text-xs text-muted-foreground">
          Need the full picture?{" "}
          <Link href="/charts/depot-diesel" className="font-semibold text-primary underline underline-offset-2">
            Open the depot diesel chart page
          </Link>{" "}
          for a larger scrubbable chart and every stored reading with its source and state.
        </p>
      </section>
    </ArticleView>
  );
}
