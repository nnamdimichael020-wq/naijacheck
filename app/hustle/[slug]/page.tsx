import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BLUEPRINT_BY_SLUG } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/hustle");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/hustle/${params.slug}`));
}

export default function HustleArticlePage({ params }: { params: { slug: string } }) {
  if (!staticSlugs("/hustle").some((s) => s.slug === params.slug)) notFound();
  const article = getArticle(`/hustle/${params.slug}`);
  const blueprint = BLUEPRINT_BY_SLUG[params.slug];
  return (
    <ArticleView article={article}>
      <Card className="border-accent/50">
        <CardHeader>
          <CardTitle className="text-lg">Test your own numbers</CardTitle>
          <CardDescription>
            {blueprint ? `Enter your capital and city to see how ${blueprint.name.toLowerCase()} compares with other models.` : "Match your capital to the blueprints."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="accent">
            <Link href="/hustle#matcher">Open the hustle matcher</Link>
          </Button>
        </CardContent>
      </Card>
    </ArticleView>
  );
}
