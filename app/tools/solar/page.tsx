import { ArticleView } from "@/components/article-view";
import { SolarCalc } from "@/components/calc/solar-calc";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/tools/solar");
export const metadata = articleMetadata(article);

export default function SolarPage() {
  return (
    <ArticleView article={article}>
      <SolarCalc />
    </ArticleView>
  );
}
