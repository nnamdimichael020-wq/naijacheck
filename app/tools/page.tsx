import Link from "next/link";
import { ArticleView } from "@/components/article-view";
import { getArticle } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

const article = getArticle("/tools");
export const metadata = articleMetadata(article);

const TOOLS = [
  { href: "/tools/generator", title: "Generator fuel calculator", blurb: "Diesel or petrol cost per day and per month." },
  { href: "/tools/solar", title: "Solar payback calculator", blurb: "Years to pay off an inverter or solar system." },
  { href: "/tools/cookbook", title: "Recipe cookbook", blurb: "Cost any Nigerian dish for your family, in your city." },
  { href: "/prices/cost-of-living", title: "Cost-of-living calculator", blurb: "How far your monthly money goes in ten cities." },
];

export default function ToolsPage() {
  return (
    <ArticleView article={article}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="block rounded-lg border bg-card p-5 hover:border-primary">
              <span className="block text-lg font-semibold">{t.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{t.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </ArticleView>
  );
}
