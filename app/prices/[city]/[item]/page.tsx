import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { ItemCitiesTable } from "@/components/prices/price-tables";
import { CITIES, CITY_BY_SLUG, ITEM_BY_SLUG, PRICE_ITEMS } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

const CORE = ["rice", "garri", "beans", "yam", "egg"];

export function generateStaticParams() {
  return CITIES.flatMap((c) => CORE.map((item) => ({ city: c.slug, item })));
}

export function generateMetadata({ params }: { params: { city: string; item: string } }) {
  return articleMetadata(getArticle(`/prices/${params.city}/${params.item}`));
}

export default function CityItemPage({ params }: { params: { city: string; item: string } }) {
  const city = CITY_BY_SLUG[params.city];
  const item = ITEM_BY_SLUG[params.item];
  if (!city || !item) notFound();
  const article = getArticle(`/prices/${city.slug}/${item.slug}`);
  return (
    <ArticleView article={article}>
      <section aria-labelledby="across" className="space-y-3">
        <h2 id="across" className="text-2xl font-bold tracking-tight">
          {item.name.split(" (")[0]} across Nigeria
        </h2>
        <ItemCitiesTable itemSlug={item.slug} />
        <p className="text-xs text-muted-foreground">
          {PRICE_ITEMS.length} items are tracked in total. Items without a city-specific band are scaled from Lagos by the city cost index.
        </p>
      </section>
    </ArticleView>
  );
}
