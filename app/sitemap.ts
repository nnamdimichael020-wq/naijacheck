import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { LIVE_FUEL, LIVE_FX } from "@/lib/live";
import { absUrl } from "@/lib/seo";

/** Static export: this file is evaluated at build time and written to /sitemap.xml. */
export const dynamic = "force-static";

/** The content-launch date: honest and stable for pages that rarely change. */
const FIXED_LASTMOD = "2026-10-09";

/**
 * Real revision of the live readings rendered on `/` and `/status`: the latest genuine
 * monitor check in `data/live/`. Never `new Date()` — the build clock would falsely claim
 * the page changed when no reading did.
 */
function liveLastmod(): string {
  const stamps = [LIVE_FX.checkedAt, LIVE_FUEL.checkedAt].filter((s): s is string => typeof s === "string" && s.length >= 10);
  return (stamps.sort().pop() ?? FIXED_LASTMOD).slice(0, 10);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const liveDate = liveLastmod();
  const fixed: MetadataRoute.Sitemap = [
    { url: absUrl("/"), lastModified: liveDate, changeFrequency: "daily", priority: 1 },
    { url: absUrl("/about"), lastModified: FIXED_LASTMOD, changeFrequency: "monthly", priority: 0.4 },
    { url: absUrl("/status"), lastModified: liveDate, changeFrequency: "daily", priority: 0.4 },
    { url: absUrl("/privacy"), lastModified: FIXED_LASTMOD, changeFrequency: "yearly", priority: 0.3 },
    { url: absUrl("/tools/quiz"), lastModified: FIXED_LASTMOD, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Every generated article is a public, indexable page — except:
  //  - hustle-combo city/capital permutations carry `noindex` (lib/seo.ts), so a sitemap
  //    that lists them would contradict the robots meta. Keep serving them to visitors
  //    while withholding them from Google until each has distinct sourced value.
  //  - /admin and /offline.html are noindex stubs and are not articles, so they never enter this list.
  // `npm run audit:static` fails the build audit if any indexable exported HTML page falls out of this sitemap.
  const generated: MetadataRoute.Sitemap = ARTICLES.filter((a) => a.section !== "hustle-combo").map((a) => {
    const isHub = a.section === "hub";
    const isDaily = a.section.startsWith("prices") || a.section === "telecom";
    return {
      url: absUrl(a.path),
      lastModified: a.updatedAt,
      changeFrequency: isDaily ? "daily" : "weekly",
      priority: isHub ? 0.8 : 0.6,
    };
  });

  return [...fixed, ...generated];
}
