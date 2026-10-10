import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { MARKET_BY_SLUG, MARKETS } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/prices/markets");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  return articleMetadata(getArticle(`/prices/markets/${resolved.slug}`));
}

export default async function MarketPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  if (!MARKET_BY_SLUG[resolved.slug] || !MARKETS.some((m) => m.slug === resolved.slug)) notFound();
  return <ArticleView article={getArticle(`/prices/markets/${resolved.slug}`)} />;
}
