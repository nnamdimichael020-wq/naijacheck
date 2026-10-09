import { ArticleView } from "@/components/article-view";
import { TrendMonitor } from "@/components/trends/trend-monitor";
import { PSYCH_TERMS, SLANG_TERMS } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/trends");
export const metadata = articleMetadata(article);

export default function TrendsPage() {
  const monitorTerms = SLANG_TERMS.map((t) => ({ slug: t.slug, term: t.term, trendScore: t.trendScore, trend: t.trend }));
  const decoder = [
    ...SLANG_TERMS.map((t) => ({ slug: t.slug, term: t.term, meaning: t.meaning, kind: "slang" as const })),
    ...PSYCH_TERMS.map((t) => ({ slug: t.slug, term: t.term, meaning: t.meaning, kind: "psych" as const })),
  ];
  return (
    <ArticleView article={article}>
      <TrendMonitor terms={monitorTerms} decoder={decoder} />
    </ArticleView>
  );
}
