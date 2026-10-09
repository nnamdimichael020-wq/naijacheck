"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchEntry } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  "prices-city": "Prices",
  "prices-item": "Prices",
  "prices-market": "Market",
  "prices-static": "Prices",
  hub: "Section",
  "trends-slang": "Slang",
  "trends-psych": "Relationships",
  "hustle-blueprint": "Hustle",
  "hustle-combo": "Hustle",
  howto: "GovHowTo",
  exam: "Exam",
  telecom: "Telecom",
  cookbook: "Cookbook",
  tools: "Tools",
  learn: "Learn",
};

function score(e: SearchEntry, terms: string[]) {
  const title = e.title.toLowerCase();
  const keys = e.keys.toLowerCase();
  const desc = e.desc.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (title.includes(t)) s += 3;
    if (keys.includes(t)) s += 2;
    if (desc.includes(t)) s += 1;
  }
  return s;
}

/**
 * Site search. The index (public/search-index.json) is fetched the first time the user focuses the box,
 * so the initial page load stays light for 2G/3G visitors.
 */
export function SearchBar({ className, id = "site-search" }: { className?: string; id?: string }) {
  const [q, setQ] = React.useState("");
  const [index, setIndex] = React.useState<SearchEntry[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [failed, setFailed] = React.useState(false);

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

  const results = React.useMemo(() => {
    const terms = q.toLowerCase().trim().split(/\s+/).filter((t) => t.length > 1);
    if (!index || terms.length === 0) return [];
    return index
      .map((e) => ({ e, s: score(e, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 8)
      .map((x) => x.e);
  }, [index, q]);

  const listId = `${id}-results`;
  const showList = open && q.trim().length > 1;

  return (
    <div className={cn("relative w-full", className)}>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor={id} className="sr-only">
          Search prices, slang, hustles, GovHowTo and exams
        </label>
        <input
          id={id}
          type="search"
          autoComplete="off"
          value={q}
          placeholder="Search rice price, kelebu, POS business, JAMB cut-off…"
          onFocus={() => {
            setOpen(true);
            load();
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key === "Enter" && results[active]) {
              window.location.href = results[active].path;
            }
          }}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${id}-opt-${active}` : undefined}
          className="h-12 w-full rounded-full border-2 border-input bg-card pl-12 pr-4 text-base shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-14"
        />
      </form>
      {showList ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-lg border bg-popover p-1 shadow-xl"
        >
          {!index && !failed ? <p className="px-3 py-2 text-sm text-muted-foreground">Loading search…</p> : null}
          {failed ? <p className="px-3 py-2 text-sm text-muted-foreground">Search is unavailable right now. Try the menu.</p> : null}
          {index && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Nothing matched. Try “rice”, “kelebu”, “JAMB” or “POS”.</p>
          ) : null}
          {results.map((r, i) => (
            <Link
              key={r.path}
              id={`${id}-opt-${i}`}
              href={r.path}
              role="option"
              aria-selected={i === active}
              className={cn(
                "flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm",
                i === active ? "bg-secondary" : "hover:bg-secondary",
              )}
              onMouseEnter={() => setActive(i)}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.desc}</span>
              </span>
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {KIND_LABEL[r.kind] ?? "Guide"}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
