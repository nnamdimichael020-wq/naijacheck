import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { CityItemsTable } from "@/components/prices/price-tables";
import { CITIES, CITY_BY_SLUG } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }) {
  return articleMetadata(getArticle(`/prices/${params.city}`));
}

export default function CityPricesPage({ params }: { params: { city: string } }) {
  const city = CITY_BY_SLUG[params.city];
  if (!city) notFound();
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
