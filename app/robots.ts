import type { MetadataRoute } from "next";
import { SITE_CONFIG } from "@/config/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    // Everything public stays crawlable. Two paths stay out:
    //  - /api/* is the dynamic Worker surface (geo, push, telegram): JSON responses already
    //    served no-store, and also absent from the sitemap.
    //  - /admin is the noindex moderation stub.
    // Pages that carry a noindex meta tag (hustle-combo permutations, /admin, /offline.html)
    // stay crawlable on purpose: Google can only honour a noindex it is allowed to read.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    // From the single committed source of truth for the canonical host (config/site.ts).
    // On the future custom domain nothing changes; see docs/runbooks/google-search-console-owner-setup.md.
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
