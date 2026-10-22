import type { Metadata } from "next";
import { Suspense } from "react";
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
    <Suspense fallback={<div className="mx-auto w-full max-w-3xl px-4 py-6"><p className="text-sm text-muted-foreground">Loading search…</p></div>}>
      <SearchResultsClient />
    </Suspense>
  );
}
