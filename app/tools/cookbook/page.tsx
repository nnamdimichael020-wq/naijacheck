import { ArticleView } from "@/components/article-view";
import { CookbookCalc } from "@/components/calc/cookbook-calc";
import { COOK_CITIES, cookRecipes } from "@/lib/cookbook";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/tools/cookbook");
export const metadata = articleMetadata(article);

export default function CookbookPage() {
  return (
    <ArticleView article={article}>
      <CookbookCalc recipes={cookRecipes()} cities={COOK_CITIES} />
    </ArticleView>
  );
}
