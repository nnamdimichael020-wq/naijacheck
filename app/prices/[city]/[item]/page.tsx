import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { ItemCitiesTable } from "@/components/prices/price-tables";
import { DIRECT_PRICE_CITIES, CITY_BY_SLUG, ITEM_BY_SLUG, PRICE_ITEMS } from "@/lib/data";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

const CORE = ["rice", "garri", "beans", "yam", "egg"];

export function generateStaticParams() {
  return DIRECT_PRICE_CITIES.flatMap((c) => CORE.map((item) => ({ city: c.slug, item })));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string; item: string }> }) {
  const resolved = await params;
  return articleMetadata(getArticle(`/prices/${resolved.city}/${resolved.item}`));
}

export default async function CityItemPage({ params }: { params: Promise<{ city: string; item: string }> }) {
  const resolved = await params;
  const city = CITY_BY_SLUG[resolved.city];
  const item = ITEM_BY_SLUG[resolved.item];
  if (!city || !item || !DIRECT_PRICE_CITIES.some((candidate) => candidate.slug === city.slug)) notFound();
  const article = getArticle(`/prices/${city.slug}/${item.slug}`);
  return (
    <ArticleView article={article}>
      <section aria-labelledby="across" className="space-y-3">
        <h2 id="across" className="text-2xl font-bold tracking-tight">
          {item.name.split(" (")[0]} across Nigeria
        </h2>
        <ItemCitiesTable itemSlug={item.slug} />
        <p className="text-xs text-muted-foreground">
          {PRICE_ITEMS.length} items have dated rows. Cities without an explicit observation stay unavailable; NaijaCheck does not scale Lagos estimates.
        </p>
      </section>
    </ArticleView>
  );
}
