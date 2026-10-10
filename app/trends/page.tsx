import { ArticleView } from "@/components/article-view";
import { TrendMonitor, type MonitorTerm } from "@/components/trends/trend-monitor";
import { PSYCH_TERMS, SLANG_TERMS } from "@/lib/data";
import { LIVE_TRENDS } from "@/lib/live";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";
import { DATASET_REGISTRY } from "@/lib/source-registry";

const article = getArticle("/trends");
export const metadata = articleMetadata(article);

export default function TrendsPage() {
  const live = LIVE_TRENDS.terms.length > 0;
  const monitorTerms: MonitorTerm[] = live
    ? LIVE_TRENDS.terms.map((t) => ({
        slug: t.slug,
        term: t.term,
        trendScore: t.score,
        trend: t.score >= 60 ? "rising" : t.score >= 25 ? "steady" : "quiet",
        mentions7d: t.mentions7d,
      }))
    : SLANG_TERMS.map((t) => ({ slug: t.slug, term: t.term, trendScore: t.trendScore, trend: t.trend }));
  const decoder = [
    ...SLANG_TERMS.map((t) => ({ slug: t.slug, term: t.term, meaning: t.meaning, kind: "slang" as const })),
    ...PSYCH_TERMS.map((t) => ({ slug: t.slug, term: t.term, meaning: t.meaning, kind: "psych" as const })),
  ];
  return (
    <ArticleView article={article}>
      <TrendMonitor
        terms={monitorTerms}
        decoder={decoder}
        wiki={LIVE_TRENDS.wiki}
        checkedAt={LIVE_TRENDS.checkedAt}
        live={live}
        state={DATASET_REGISTRY.find((d) => d.id === "trend-signals")?.state ?? "unavailable"}
        method={LIVE_TRENDS.method}
      />
    </ArticleView>
  );
}
