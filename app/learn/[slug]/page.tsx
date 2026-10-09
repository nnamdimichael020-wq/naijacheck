import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { LEARN_TOPICS } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEARN_TOPICS.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/learn/${params.slug}`));
}

export default function LearnArticlePage({ params }: { params: { slug: string } }) {
  if (!staticSlugs("/learn").some((s) => s.slug === params.slug)) notFound();
  return <ArticleView article={getArticle(`/learn/${params.slug}`)} />;
}
