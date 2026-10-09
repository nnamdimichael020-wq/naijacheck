import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { CookbookCalc } from "@/components/calc/cookbook-calc";
import { COOK_CITIES, cookRecipes } from "@/lib/cookbook";
import { RECIPES } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return RECIPES.map((r) => ({ slug: r.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/tools/cookbook/${params.slug}`));
}

export default function RecipePage({ params }: { params: { slug: string } }) {
  if (!staticSlugs("/tools/cookbook").some((s) => s.slug === params.slug)) notFound();
  const recipes = cookRecipes(params.slug);
  return (
    <ArticleView article={getArticle(`/tools/cookbook/${params.slug}`)}>
      <section aria-labelledby="scale" className="space-y-3">
        <h2 id="scale" className="text-2xl font-bold tracking-tight">
          Live cost calculator
        </h2>
        <p className="text-sm text-muted-foreground">Change the city or the number of people. The cost updates straight away.</p>
        <CookbookCalc recipes={recipes} cities={COOK_CITIES} fixedSlug={params.slug} />
      </section>
    </ArticleView>
  );
}
