import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { LEARN_TOPICS } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEARN_TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  return articleMetadata(getArticle(`/learn/${resolved.slug}`));
}

export default async function LearnArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  if (!staticSlugs("/learn").some((s) => s.slug === resolved.slug)) notFound();
  return <ArticleView article={getArticle(`/learn/${resolved.slug}`)} />;
}
