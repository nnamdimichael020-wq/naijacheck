import { ArticleView } from "@/components/article-view";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/prices/generator-diesel");
export const metadata = articleMetadata(article);

export default function GeneratorDieselPage() {
  return <ArticleView article={article} />;
}
