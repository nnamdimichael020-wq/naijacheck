import { ArticleView } from "@/components/article-view";
import { HustleForm } from "@/components/hustle/hustle-form";
import { BLUEPRINTS, CITIES, CITY_FACTORS } from "@/lib/data";
import { PREMIUM_PRICE_NGN } from "@/config/site";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/hustle");
export const metadata = articleMetadata(article);

export default function HustlePage() {
  return (
    <ArticleView article={article}>
      <HustleForm
        blueprints={BLUEPRINTS}
        cities={CITIES.map((c) => ({ slug: c.slug, name: c.name }))}
        cityFactors={CITY_FACTORS}
        premiumPrice={PREMIUM_PRICE_NGN}
        premiumRange={[1500, 3000]}
      />
    </ArticleView>
  );
}
