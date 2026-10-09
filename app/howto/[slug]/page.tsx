import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { GOV_DOCS } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/howto");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/howto/${params.slug}`));
}

export default function HowToPage({ params }: { params: { slug: string } }) {
  const doc = GOV_DOCS.find((d) => d.slug === params.slug);
  if (!doc) notFound();
  return <ArticleView article={getArticle(`/howto/${doc.slug}`)} />;
}
