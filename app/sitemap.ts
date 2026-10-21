import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { LIVE_FUEL, LIVE_FX, datasetHistoryPoints } from "@/lib/live";
import { CHART_PAGES } from "@/lib/chart-pages";
import { BANKS_FILE_UPDATED_AT, getAllBanks } from "@/lib/banks";
import { getAllPostalStates, getAllPostalAreaParams, POSTAL_FILE_UPDATED_AT } from "@/lib/postal";
import { LGAS_FILE_UPDATED_AT, getAllLgaStates, getAllLgaParams } from "@/lib/lgas";
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

/**
 * Latest *stored* observation for a chart dataset, or the live-check date when a series has no
 * rows yet. Never `new Date()`: a build must not claim a chart changed when no reading arrived.
 */
function chartLastmod(dataset: string, fallback: string): string {
  const last = datasetHistoryPoints(dataset).at(-1);
  return last ? last.observedAt.slice(0, 10) : fallback;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const liveDate = liveLastmod();
  // FX & fuel history hubs: indexable entry points for naira-to-dollar and depot-fuel history.
  // Their lastModified follows the newest stored FX/fuel observation so the sitemap stays honest
  // and agrees with the page (never the build clock).
  function hubLastmod(datasets: string[]): string {
    const stamps = datasets.map((d) => chartLastmod(d, liveDate)).sort();
    return stamps.pop() ?? liveDate;
  }
  const fxHubLastmod = hubLastmod(["parallel-usd-ngn-buy", "cbn-usd-ngn"]);
  const fuelHubLastmod = hubLastmod(["fuel-depot-petrol", "fuel-depot-diesel", "fuel-depot-lpg"]);
  const fixed: MetadataRoute.Sitemap = [
    { url: absUrl("/"), lastModified: liveDate, changeFrequency: "daily", priority: 1 },
    { url: absUrl("/about"), lastModified: FIXED_LASTMOD, changeFrequency: "monthly", priority: 0.4 },
    { url: absUrl("/status"), lastModified: liveDate, changeFrequency: "daily", priority: 0.4 },
    { url: absUrl("/privacy"), lastModified: FIXED_LASTMOD, changeFrequency: "yearly", priority: 0.3 },
    { url: absUrl("/tools/quiz"), lastModified: FIXED_LASTMOD, changeFrequency: "weekly", priority: 0.7 },
    { url: absUrl("/rates"), lastModified: fxHubLastmod, changeFrequency: "daily", priority: 0.7 },
    { url: absUrl("/rates/history"), lastModified: fxHubLastmod, changeFrequency: "daily", priority: 0.5 },
  ];

  // Codes hub: banks + postal. LastModified is file updatedAt so sitemap stays honest (no build clock).
  const banksUpdatedAt =
    BANKS_FILE_UPDATED_AT && /^\d{4}-\d{2}-\d{2}/.test(BANKS_FILE_UPDATED_AT) ? BANKS_FILE_UPDATED_AT.slice(0, 10) : FIXED_LASTMOD;
  const postalUpdatedAt =
    POSTAL_FILE_UPDATED_AT && /^\d{4}-\d{2}-\d{2}/.test(POSTAL_FILE_UPDATED_AT) ? POSTAL_FILE_UPDATED_AT.slice(0, 10) : FIXED_LASTMOD;
  const bankSitemap: MetadataRoute.Sitemap = [
    { url: absUrl("/codes"), lastModified: postalUpdatedAt > banksUpdatedAt ? postalUpdatedAt : banksUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    { url: absUrl("/codes/banks"), lastModified: banksUpdatedAt, changeFrequency: "weekly", priority: 0.6 },
    ...getAllBanks().map((b) => ({
      url: absUrl(`/codes/banks/${b.slug}`),
      lastModified: b.lastVerified.slice(0, 10),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
  const postalSitemap: MetadataRoute.Sitemap = [
    { url: absUrl("/codes/postal"), lastModified: postalUpdatedAt, changeFrequency: "weekly", priority: 0.6 },
    ...getAllPostalStates().map((s) => ({
      url: absUrl(`/codes/postal/${s.slug}`),
      lastModified: s.lastVerified.slice(0, 10),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...getAllPostalAreaParams().map(({ state, area }) => {
      const st = getAllPostalStates().find((x) => x.slug === state);
      return {
        url: absUrl(`/codes/postal/${state}/${area}`),
        lastModified: st?.lastVerified.slice(0, 10) ?? postalUpdatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      };
    }),
  ];

  // Geo — 774 LGAs (768 + 6 FCT councils) — URL scheme /geo chosen to avoid /codes/banks, /codes/postal collision.
  // Docs: docs/runbooks/lgas.md — why /geo not /codes/lga. Sitemap lastModified from data/lgas.json.
  const lgasUpdatedAt =
    LGAS_FILE_UPDATED_AT && /^\d{4}-\d{2}-\d{2}/.test(LGAS_FILE_UPDATED_AT) ? LGAS_FILE_UPDATED_AT.slice(0, 10) : FIXED_LASTMOD;
  const geoSitemap: MetadataRoute.Sitemap = [
    { url: absUrl("/geo"), lastModified: lgasUpdatedAt, changeFrequency: "weekly", priority: 0.7 },
    ...getAllLgaStates().map((s) => ({
      url: absUrl(`/geo/${s.slug}`),
      lastModified: s.lastVerified.slice(0, 10),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...getAllLgaParams().map(({ state, lga }) => {
      const st = getAllLgaStates().find((x) => x.slug === state);
      return {
        url: absUrl(`/geo/${state}/${lga}`),
        lastModified: st?.lastVerified.slice(0, 10) ?? lgasUpdatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      };
    }),
  ];

  // Dedicated chart pages. Their lastModified is the newest stored observation for the series, so
  // the sitemap agrees with the page instead of using the build clock.
  const charts: MetadataRoute.Sitemap = [
    { url: absUrl("/charts"), lastModified: liveDate, changeFrequency: "daily" as const, priority: 0.6 },
    ...CHART_PAGES.map((page) => ({
      url: absUrl(`/charts/${page.slug}`),
      lastModified: chartLastmod(page.dataset, liveDate),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
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

  return [...fixed, ...charts, ...bankSitemap, ...postalSitemap, ...geoSitemap, ...generated];
}
