import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_CONFIG } from "@/config/site";
import { absUrl } from "@/lib/seo";
import { ShareControls } from "@/components/share-controls";
import { SearchResultsClient } from "@/components/search-results-client";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Search — NaijaCheck",
  description: "Search NaijaCheck — cities, bank & postal codes, LGAs, rates, fuel charts, slang, how-to, tools and more.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://naijacheck.ng/search" },
};

export default function SearchPage() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Search NaijaCheck</h1>
            <p className="mt-2 text-sm text-muted-foreground">Loading search…</p>
          </div>
        }
      >
        <SearchResultsClient />
      </Suspense>
      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <ShareControls
          placement="inline"
          title={`Search ${SITE_CONFIG.name}`}
          url={absUrl("/search")}
          summary="search Nigerian FX & fuel charts, bank codes, postal codes, 774 LGAs and guides"
        />
      </div>
    </div>
  );
}
