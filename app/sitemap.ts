import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { absUrl } from "@/lib/seo";

/** Static export: this file is evaluated at build time and written to /sitemap.xml. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const fixed: MetadataRoute.Sitemap = [
    { url: absUrl("/"), lastModified: "2026-10-09", changeFrequency: "daily", priority: 1 },
    { url: absUrl("/about"), lastModified: "2026-10-09", changeFrequency: "monthly", priority: 0.4 },
    { url: absUrl("/status"), lastModified: "2026-10-09", changeFrequency: "daily", priority: 0.4 },
    { url: absUrl("/privacy"), lastModified: "2026-10-09", changeFrequency: "yearly", priority: 0.3 },
  ];

  const generated: MetadataRoute.Sitemap = ARTICLES.map((a) => {
    const isHub = a.section === "hub";
    const isDaily = a.section.startsWith("prices") || a.section === "telecom";
    return {
      url: absUrl(a.path),
      lastModified: a.updatedAt,
      changeFrequency: isDaily ? "daily" : "weekly",
      priority: isHub ? 0.8 : a.section === "hustle-combo" ? 0.5 : 0.6,
    };
  });

  return [...fixed, ...generated];
}
