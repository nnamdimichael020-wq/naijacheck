import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { MARKET_BY_SLUG, MARKETS } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/prices/markets");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/prices/markets/${params.slug}`));
}

export default function MarketPage({ params }: { params: { slug: string } }) {
  if (!MARKET_BY_SLUG[params.slug] || !MARKETS.some((m) => m.slug === params.slug)) notFound();
  return <ArticleView article={getArticle(`/prices/markets/${params.slug}`)} />;
}
