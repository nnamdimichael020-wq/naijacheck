import { ArticleView } from "@/components/article-view";
import { GeneratorCalc } from "@/components/calc/generator-calc";
import { FUEL, petrolPumpPrice } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/tools/generator");
export const metadata = articleMetadata(article);

export default function GeneratorPage() {
  const diesel = FUEL.depots.find((d) => d.name === "National median depot (diesel)")?.price ?? 1775;
  const petrol = petrolPumpPrice("lagos") ?? 1355;
  return (
    <ArticleView article={article}>
      <GeneratorCalc dieselDefault={Number(diesel)} petrolDefault={petrol} />
    </ArticleView>
  );
}
