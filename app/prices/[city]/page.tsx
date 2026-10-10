import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { CityItemsTable } from "@/components/prices/price-tables";
import { DIRECT_PRICE_CITIES, CITY_BY_SLUG } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return DIRECT_PRICE_CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }) {
  const resolved = await params;
  return articleMetadata(getArticle(`/prices/${resolved.city}`));
}

export default async function CityPricesPage({ params }: { params: Promise<{ city: string }> }) {
  const resolved = await params;
  const city = CITY_BY_SLUG[resolved.city];
  if (!city || !DIRECT_PRICE_CITIES.some((candidate) => candidate.slug === city.slug)) notFound();
  const article = getArticle(`/prices/${city.slug}`);
  return (
    <ArticleView article={article}>
      <section aria-labelledby="all-items" className="space-y-3">
        <h2 id="all-items" className="text-2xl font-bold tracking-tight">
          All 17 items in {city.name}
        </h2>
        <CityItemsTable citySlug={city.slug} />
      </section>
    </ArticleView>
  );
}
