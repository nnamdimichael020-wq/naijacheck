import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { GOV_DOCS } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/howto");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  return articleMetadata(getArticle(`/howto/${resolved.slug}`));
}

export default async function HowToPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolved = await params;
  const doc = GOV_DOCS.find((d) => d.slug === resolved.slug);
  if (!doc) notFound();
  return <ArticleView article={getArticle(`/howto/${doc.slug}`)} />;
}
