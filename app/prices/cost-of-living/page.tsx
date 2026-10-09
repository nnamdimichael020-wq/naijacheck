import { ArticleView } from "@/components/article-view";
import { CostOfLivingCalc } from "@/components/calc/cost-of-living";
import { CITIES, NON_FOOD, basketCost } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/prices/cost-of-living");
export const metadata = articleMetadata(article);

export default function CostOfLivingPage() {
  const cities = CITIES.map((c) => ({ slug: c.slug, name: c.name, basket: Math.round(basketCost(c.slug)) }));
  return (
    <ArticleView article={article}>
      <CostOfLivingCalc cities={cities} nonFood={NON_FOOD} />
    </ArticleView>
  );
}
