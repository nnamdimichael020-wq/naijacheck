import { notFound } from "next/navigation";
import { ArticleView } from "@/components/article-view";
import { EXAM, naira } from "@/lib/data";
import { getArticle, staticSlugs } from "@/lib/articles";
import { articleMetadata } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return staticSlugs("/exam");
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return articleMetadata(getArticle(`/exam/${params.slug}`));
}

export default function ExamPage({ params }: { params: { slug: string } }) {
  if (!staticSlugs("/exam").some((s) => s.slug === params.slug)) notFound();
  const path = `/exam/${params.slug}`;
  const isNational = params.slug === "jamb-cutoff-2026";
  return (
    <ArticleView article={getArticle(path)}>
      {isNational ? (
        <section aria-labelledby="inst" className="space-y-3">
          <h2 id="inst" className="text-2xl font-bold tracking-tight">
            School-by-school cut-offs
          </h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[480px] text-sm">
              <caption className="border-b bg-secondary/50 px-3 py-2 text-left text-xs text-muted-foreground">
                Reported 2026 figures. Confirm on the school portal.
              </caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-3 py-2">
                    School
                  </th>
                  <th scope="col" className="px-3 py-2">
                    General
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Post-UTME
                  </th>
                </tr>
              </thead>
              <tbody>
                {EXAM.institutions.map((i) => (
                  <tr key={i.slug} className="border-t">
                    <td className="px-3 py-2.5 font-medium">
                      <a className="hover:text-primary hover:underline" href={`/exam/jamb-cutoff-${i.slug}-2026`}>
                        {i.short}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{i.general}</td>
                    <td className="px-3 py-2.5">{i.postUtme ? "Yes" : "Check notice"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Private universities reported in 2026: {EXAM.privateUniversitiesReported2026.map((p) => `${p.name} (${naira(p.cutOff).replace("₦", "")})`).join(", ")}.
          </p>
        </section>
      ) : null}
    </ArticleView>
  );
}
