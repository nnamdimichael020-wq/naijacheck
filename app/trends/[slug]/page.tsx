import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { SLANG_BY_SLUG } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/trends");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/trends/${params.slug}`));
}

export default function TrendPage({ params }: { params: { slug: string } }) {
  const path = `/trends/${params.slug}`;
  if (!staticSlugs("/trends").some((s) => s.slug === params.slug)) notFound();
  const term = SLANG_BY_SLUG[params.slug];
  return (
    <ArticleView article={getArticle(path)}>
      {term ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Trend index <strong className="text-foreground">{term.trendScore}/100</strong>, status{" "}
          <strong className="text-foreground">{term.trend}</strong>. Confidence: {term.confidence}. Editorial estimate from our weekly review.
        </p>
      ) : null}
    </ArticleView>
  );
}
