"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { SearchEntry } from "@/lib/types";
import { SEARCH_CATEGORIES, rankedSearch, filterByCategory, WAT_SEARCH_KIND_LABEL } from "@/lib/search";

const KIND_LABEL = WAT_SEARCH_KIND_LABEL;

function useIndex() {
  const [index, setIndex] = React.useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setIndex(d as SearchEntry[]);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { index, failed };
}

export function SearchResultsClient() {
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const categoryParam = sp.get("category") ?? sp.get("kind") ?? "all";
  // keep local category in sync with URL; allow changing via chips
  const [category, setCategory] = React.useState(categoryParam);
  React.useEffect(() => {
    setCategory(categoryParam);
  }, [categoryParam]);

  const { index, failed } = useIndex();
  const trimmed = q.trim();

  const results = React.useMemo(() => {
    if (!index) return null;
    if (!trimmed) {
      // Empty query + All: show popular/browse? On full page, show category browse if filter active
      if (category !== "all") return filterByCategory(index, category).slice(0, 50);
      return null; // Show guidance instead
    }
    return rankedSearch(index, q, category, 50);
  }, [index, q, category, trimmed]);

  const count = results?.length ?? 0;
  const totalInCategory = React.useMemo(() => {
    if (!index) return 0;
    return filterByCategory(index, category).length;
  }, [index, category]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {trimmed ? (
          <>
            Search results for <span className="text-primary">“{trimmed}”</span>
          </>
        ) : (
          "Search NaijaCheck"
        )}
      </h1>
      {!trimmed ? <p className="mt-2 text-sm text-muted-foreground">Type a keyword or filter by category — everything searchable is indexed from real routes. No fake data.</p> : null}
      {trimmed && results ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {count} result{count !== 1 ? "s" : ""} {category !== "all" ? `in ${SEARCH_CATEGORIES.find((c) => c.id === category)?.label}` : ""} — ranked by title, keys & description matches.
        </p>
      ) : null}

      {/* Category filter chips — visible active */}
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter results by category">
        {SEARCH_CATEGORIES.map((c) => {
          const active = c.id === category;
          const href = trimmed
            ? `/search?${new URLSearchParams({ q: trimmed, ...(c.id !== "all" ? { category: c.id } : {}) }).toString()}`
            : `/search?${new URLSearchParams({ ...(c.id !== "all" ? { category: c.id } : {}) }).toString()}`;
          return (
            <Link
              key={c.id}
              href={href}
              onClick={() => setCategory(c.id)}
              className={
                active
                  ? "rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
                  : "rounded-full border bg-card px-4 py-1.5 text-sm font-medium hover:bg-secondary"
              }
              aria-current={active ? "page" : undefined}
            >
              {c.label} {active && index ? `· ${totalInCategory}` : ""}
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Reset policy: filter stays with your search query; clear by picking <strong>All</strong> or opening a result.
      </p>

      <div className="mt-6">
        {failed ? <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Search is unavailable right now. Try the menu.</p> : null}
        {!index && !failed ? <p className="p-4 text-sm text-muted-foreground">Loading index…</p> : null}

        {index && !trimmed && category === "all" ? (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Browse by category</h2>
            <p className="mt-1 text-xs text-muted-foreground">Pick a filter above or try: gtbank, 100001, lagos, petrol, ikeja, chikin…</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SEARCH_CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                <Link
                  key={c.id}
                  href={`/search?${new URLSearchParams({ category: c.id }).toString()}`}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-secondary"
                >
                  <span className="font-medium">{c.label}</span> <span className="text-muted-foreground">· {filterByCategory(index!, c.id).length} items</span>
                  <span className="block text-xs text-muted-foreground">{c.desc}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {index && trimmed && results && results.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="font-medium">No results for “{trimmed}”{category !== "all" ? ` in ${SEARCH_CATEGORIES.find((c) => c.id === category)?.label}` : ""}.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a broader term, switch to All, or explore:</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/" className="rounded-full border px-4 py-2 text-sm hover:bg-secondary">Homepage</Link>
              <Link href="/codes" className="rounded-full border px-4 py-2 text-sm hover:bg-secondary">Codes hub</Link>
              <Link href="/geo" className="rounded-full border px-4 py-2 text-sm hover:bg-secondary">774 LGAs</Link>
              <Link href="/rates" className="rounded-full border px-4 py-2 text-sm hover:bg-secondary">Rates</Link>
            </div>
          </div>
        ) : null}

        {results && results.length > 0 ? (
          <ul className="space-y-2">
            {results.map((r) => (
              <li key={r.path} className="rounded-xl border bg-card px-4 py-3 hover:bg-secondary/50">
                <Link href={r.path} className="block">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{r.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.desc}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.path}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{KIND_LABEL[r.kind] ?? r.kind}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {index && !trimmed && category !== "all" && results ? (
          <div className="mt-2">
            {results.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No items in this category.</p> : null}
            {results.length > 0 ? (
              <ul className="space-y-2">
                {results.map((r) => (
                  <li key={r.path} className="rounded-xl border bg-card px-4 py-3 hover:bg-secondary/50">
                    <Link href={r.path} className="block">
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{r.desc}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{KIND_LABEL[r.kind] ?? r.kind}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
