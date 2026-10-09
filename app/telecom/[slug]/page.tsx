import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { TELECOM, naira } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/telecom");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/telecom/${params.slug}`));
}

export default function TelecomPage({ params }: { params: { slug: string } }) {
  if (!staticSlugs("/telecom").some((s) => s.slug === params.slug)) notFound();
  const network = TELECOM.networks.find((n) => n.slug === params.slug);
  return (
    <ArticleView article={getArticle(`/telecom/${params.slug}`)}>
      {network ? (
        <section aria-labelledby="plans" className="space-y-3">
          <h2 id="plans" className="text-2xl font-bold tracking-tight">
            {network.name} sample plans
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[320px] text-sm">
              <caption className="border-b bg-secondary/50 px-3 py-2 text-left text-xs text-muted-foreground">
                Indicative sample bundles from our 2026 comparator. Confirm in the app.
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2">
                    Bundle
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {network.plans.map((p) => (
                  <tr key={p.label} className="border-t">
                    <td className="px-3 py-2.5">{p.label}</td>
                    <td className="px-3 py-2.5 tabular-nums">{naira(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </ArticleView>
  );
}
