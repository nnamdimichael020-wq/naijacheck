"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchEntry } from "@/lib/types";
import {
  SEARCH_CATEGORIES,
  POPULAR_SHORTCUTS,
  filterByCategory,
  rankedSearch,
  WAT_SEARCH_KIND_LABEL,
} from "@/lib/search";

const KIND_LABEL: Record<string, string> = WAT_SEARCH_KIND_LABEL;

function useHotkeyFocus(inputRef: React.RefObject<HTMLInputElement | null>) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputRef]);
}

/**
 * Site search. The index (public/search-index.json) is fetched the first time the user focuses the box,
 * so the initial page load stays light for 3G visitors.
 */
export function SearchBar({ className, id = "site-search" }: { className?: string; id?: string }) {
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [index, setIndex] = React.useState<SearchEntry[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [failed, setFailed] = React.useState(false);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  useHotkeyFocus(inputRef);

  const load = React.useCallback(async () => {
    if (index || failed) return;
    try {
      const res = await fetch("/search-index.json");
      if (!res.ok) throw new Error(String(res.status));
      setIndex((await res.json()) as SearchEntry[]);
    } catch {
      setFailed(true);
    }
  }, [index, failed]);

  const trimmed = q.trim();
  const isAllEmpty = category === "all" && trimmed.length === 0;

  const results = React.useMemo(() => {
    if (!index) return [];
    if (isAllEmpty) return [];
    // rankedSearch handles empty query browse mode and filtered categories
    return rankedSearch(index, q, category, 8);
  }, [index, q, category, isAllEmpty]);

  const popular = POPULAR_SHORTCUTS;
  const showPopular = open && isAllEmpty && !failed && !!index;
  const showBrowse = open && category !== "all" && trimmed.length === 0 && index && results.length > 0;
  const showResults = open && trimmed.length > 1;
  const showList = open && (showResults || showBrowse || showPopular || failed || (index && results.length === 0 && trimmed.length > 1));

  const listId = `${id}-results`;
  const hasDropdown = showList;

  const navigateToSearch = React.useCallback(
    (query: string, cat: string) => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (cat && cat !== "all") params.set("category", cat);
      // Empty query + Enter: stay put, show popular — don't push empty /search
      if (!params.get("q")) return;
      router.push(`/search?${params.toString()}`);
      setOpen(false);
      // Reset filter on navigation is documented; we keep category locally but new page will read from URL
    },
    [router],
  );

  // Reset active index when results change
  React.useEffect(() => {
    setActive(0);
  }, [q, category, results.length]);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed.length > 0) navigateToSearch(q, category);
        }}
        className="flex flex-wrap gap-2"
      >
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={id} className="sr-only">
            Search NaijaCheck
          </label>
          <input
            ref={inputRef}
            id={id}
            type="search"
            autoComplete="off"
            value={q}
            placeholder="Search rice price, kelebu, GTBank sort, postal code…"
            onFocus={() => {
              setOpen(true);
              load();
            }}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter") {
                // If dropdown is open and user expects full search, go to /search
                // (spec test: Enter on gtbank → /search?q=gtbank)
                if (trimmed.length > 0) {
                  e.preventDefault();
                  navigateToSearch(q, category);
                }
              }
            }}
            role="combobox"
            aria-expanded={hasDropdown ? true : false}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={hasDropdown && results[active] ? `${id}-opt-${active}` : undefined}
            className="h-12 w-full rounded-full border-2 border-input bg-card pl-12 pr-4 text-base shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-14"
          />
        </div>

        {/* Filter beside search — compact select, min 44px, dark-mode readable */}
        <div className="flex min-h-11 items-center">
          <label htmlFor={`${id}-filter`} className="sr-only">
            Filter by category
          </label>
          <select
            id={`${id}-filter`}
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setOpen(true);
              load();
              // keep focus on input for continuous typing
              inputRef.current?.focus();
            }}
            onFocus={load}
            className="h-12 min-h-11 min-w-[120px] rounded-full border-2 border-input bg-card px-4 pr-8 text-sm font-medium shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-14"
            aria-label="Filter by category"
          >
            {SEARCH_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Visible Search action for submit — min 44px */}
        <button
          type="submit"
          className="inline-flex h-12 min-h-11 min-w-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-14"
          aria-label="Search"
        >
          <span className="hidden sm:inline">Search</span>
          <Search className="size-4 sm:hidden" aria-hidden="true" />
        </button>
      </form>

      {hasDropdown ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] max-h-96 overflow-y-auto rounded-lg border bg-popover p-1 shadow-xl"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {!index && !failed ? <p className="px-3 py-2 text-sm text-muted-foreground">Loading search…</p> : null}
          {failed ? <p className="px-3 py-2 text-sm text-muted-foreground">Search is unavailable right now. Try the menu.</p> : null}

          {/* Popular shortcuts — All + empty */}
          {showPopular ? (
            <div className="space-y-1 p-1">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popular</p>
              {popular.map((p) => (
                <Link
                  key={p.path}
                  href={p.path}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{KIND_LABEL[p.kind] ?? p.kind}</span>
                </Link>
              ))}
              <p className="px-2 py-1 text-xs text-muted-foreground">Tip: try “gtbank”, “100001”, “lagos”, “chikin” or filter by Cities.</p>
            </div>
          ) : null}

          {/* Browse mode — category + empty query */}
          {showBrowse ? (
            <div className="space-y-1">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Browse {SEARCH_CATEGORIES.find((c) => c.id === category)?.label} — {filterByCategory(index!, category).length} items
              </p>
              {results.map((r, i) => (
                <Link
                  key={r.path}
                  id={`${id}-opt-${i}`}
                  href={r.path}
                  role="option"
                  aria-selected={i === active}
                  className={cn("flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm", i === active ? "bg-secondary" : "hover:bg-secondary")}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOpen(false)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.desc}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{KIND_LABEL[r.kind] ?? r.kind}</span>
                </Link>
              ))}
              <Link href={`/search?${new URLSearchParams({ category }).toString()}`} className="block px-3 py-2 text-xs font-semibold text-primary hover:underline">
                See all {SEARCH_CATEGORIES.find((c) => c.id === category)?.label} →
              </Link>
            </div>
          ) : null}

          {/* Search results */}
          {showResults ? (
            <>
              {index && results.length === 0 ? (
                <div className="px-3 py-3 text-sm">
                  <p className="font-medium">No results for “{trimmed}” in {SEARCH_CATEGORIES.find((c) => c.id === category)?.label ?? "All"}.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try a broader term or switch category. Popular:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Link href="/codes" onClick={() => setOpen(false)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary">
                      Explore codes
                    </Link>
                    <Link href="/" onClick={() => setOpen(false)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary">
                      Homepage Explore
                    </Link>
                    <Link href="/geo" onClick={() => setOpen(false)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary">
                      774 LGAs
                    </Link>
                  </div>
                </div>
              ) : null}
              {results.map((r, i) => (
                <Link
                  key={r.path}
                  id={`${id}-opt-${i}`}
                  href={r.path}
                  role="option"
                  aria-selected={i === active}
                  className={cn("flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm", i === active ? "bg-secondary" : "hover:bg-secondary")}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.desc}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{KIND_LABEL[r.kind] ?? r.kind}</span>
                </Link>
              ))}
              {results.length > 0 ? (
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary text-left"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => navigateToSearch(q, category)}
                >
                  See all {results.length}+ results for “{trimmed}” →
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
