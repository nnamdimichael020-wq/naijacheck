"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchEntry } from "@/lib/types";
import {
  SEARCH_CATEGORIES,
  POPULAR_SHORTCUTS,
  rankedDropdownSearch,
  countDeepMatches,
  WAT_SEARCH_KIND_LABEL,
} from "@/lib/search";
import {
  createSearchIdleController,
  INITIAL_IDLE_SNAPSHOT,
} from "@/lib/search-idle";

const KIND_LABEL: Record<string, string> = WAT_SEARCH_KIND_LABEL;

const STATIC_PLACEHOLDER = "Search rice price, kelebu, GTBank sort, postal code…";

function useHotkeyFocus(inputRef: React.RefObject<HTMLInputElement | null>) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = inputRef.current;
      // Only focus the currently visible SearchBar instance (desktop vs mobile header row)
      if (!el || el.offsetParent === null) return;
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (isTyping) return;
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        el.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        el.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputRef]);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Subtle decorative magnifier + cradling hands SVG cue for compact idle state.
 * Pure inline SVG (`aria-hidden="true"`), zero external runtime cost.
 */
function CompactLensHandsCue() {
  return (
    <svg
      viewBox="0 0 28 24"
      fill="none"
      className="search-hands-cue size-6 shrink-0 text-primary"
      aria-hidden="true"
    >
      {/* Left gentle cradling palm arc */}
      <path
        d="M5.2 6.5C3.1 8.6 3.1 14.4 5.4 16.8C6.2 17.6 7.3 18.2 8.4 18.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Right gentle cradling palm arc */}
      <path
        d="M22.8 6.5C24.9 8.6 24.9 14.4 22.6 16.8C21.8 17.6 20.7 18.2 19.6 18.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
      {/* Magnifier lens + handle */}
      <circle cx="13.2" cy="11" r="4.6" stroke="currentColor" strokeWidth="2" />
      <path d="M16.7 14.5L19.8 17.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Header site search.
 *  - Lazy-fetches `/search-index.json` only on first focus (3G friendly).
 *  - Dropdown shows top-level allowlisted hubs ONLY (`DROPDOWN_TOP_LEVEL_ALLOWLIST`).
 *  - Submitting (Enter / Search button) navigates to `/search` for full omni deep results.
 *  - Runs a lightweight CSS + React idle animation loop when idle, pausing immediately
 *    on focus, typing, desktop hover, open panel, or `prefers-reduced-motion: reduce`.
 */
export function SearchBar({ className, id = "site-search" }: { className?: string; id?: string }) {
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [index, setIndex] = React.useState<SearchEntry[] | null>(null);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [failed, setFailed] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isTabHidden, setIsTabHidden] = React.useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const isReducedMotion = usePrefersReducedMotion();
  useHotkeyFocus(inputRef);

  // Deterministic idle state machine instance (one per bar)
  const controllerRef = React.useRef<ReturnType<typeof createSearchIdleController> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createSearchIdleController();
  }
  const idleCtrl = controllerRef.current;

  const idleSnapshot = React.useSyncExternalStore(
    idleCtrl.subscribe,
    idleCtrl.getSnapshot,
    () => INITIAL_IDLE_SNAPSHOT,
  );

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

  // Start / stop idle controller across component lifecycle
  React.useEffect(() => {
    const mqReduced =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
    idleCtrl.start({
      reducedMotion: mqReduced,
      tabHidden: typeof document !== "undefined" && document.visibilityState === "hidden",
    });
    return () => {
      idleCtrl.stop();
    };
  }, [idleCtrl]);

  // Sync engagement flags with idle controller
  const hasRealInput = q.length > 0;
  React.useEffect(() => {
    idleCtrl.updateEngagement({
      reducedMotion: isReducedMotion,
      focused: isFocused,
      hovered: isHovered,
      hasInput: hasRealInput,
      panelOpen: open,
      tabHidden: isTabHidden,
    });
  }, [idleCtrl, isReducedMotion, isFocused, isHovered, hasRealInput, open, isTabHidden]);

  // Pause background timers when browser tab is hidden to save mobile battery/CPU
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setIsTabHidden(document.visibilityState === "hidden");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Close dropdown & clear focus when clicking/tapping outside the search container
  React.useEffect(() => {
    const onOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, []);

  // Client navigation detection: restart idle loop cleanly on new page when bar is not focused
  const prevPathRef = React.useRef(pathname);
  React.useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      setOpen(false);
      if (!isFocused) {
        setQ("");
        idleCtrl.notifyNavigation();
      }
    }
  }, [pathname, isFocused, idleCtrl]);

  const trimmed = q.trim();
  const isAllEmpty = category === "all" && trimmed.length === 0;

  // Dropdown results: strictly shallow top-level allowlisted hubs
  const dropdownResults = React.useMemo(() => {
    if (!index) return [];
    if (isAllEmpty) return [];
    return rankedDropdownSearch(index, q, category, 6);
  }, [index, q, category, isAllEmpty]);

  // Accurate deep match count on `/search` for Enter hints
  const deepMatchCount = React.useMemo(() => {
    if (!index) return 0;
    return countDeepMatches(index, q, category);
  }, [index, q, category]);

  const popular = POPULAR_SHORTCUTS;
  const showPopular = open && isAllEmpty && !failed && !!index;
  const showBrowse = open && category !== "all" && trimmed.length === 0 && !!index && dropdownResults.length > 0;
  const showResults = open && trimmed.length > 1;
  const showList =
    open &&
    (showResults ||
      showBrowse ||
      showPopular ||
      failed ||
      (!index && !failed) ||
      (!!index && dropdownResults.length === 0 && trimmed.length > 1));

  const listId = `${id}-results`;
  const hasDropdown = showList;

  const navigateToSearch = React.useCallback(
    (query: string, cat: string) => {
      const cleanQ = query.trim();
      const params = new URLSearchParams();
      if (cleanQ) params.set("q", cleanQ);
      if (cat && cat !== "all") params.set("category", cat);
      // Never submit an empty All query (protects against accidental Enter when idle)
      if (!cleanQ && (!cat || cat === "all")) return;
      router.push(`/search?${params.toString()}`);
      setOpen(false);
      setActive(-1);
      setQ("");
      setIsFocused(false);
      inputRef.current?.blur();
    },
    [router],
  );

  // Reset keyboard selection when query or category changes
  React.useEffect(() => {
    setActive(-1);
  }, [q, category, dropdownResults.length]);

  const { phase, typed, isCompactVisual: rawCompact, showTypewriterOverlay: rawOverlay } = idleSnapshot;
  const isCompactVisual = !isReducedMotion && rawCompact;
  const showTypewriterOverlay = !isReducedMotion && !isFocused && !hasRealInput && rawOverlay;

  const activeCategoryLabel = SEARCH_CATEGORIES.find((c) => c.id === category)?.label ?? "All";

  return (
    <div
      ref={containerRef}
      data-search-phase={isReducedMotion ? "reduced-motion" : phase}
      className={cn("relative flex h-12 w-full items-center justify-center md:h-14", className)}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") {
          setIsHovered(true);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch" && e.pointerType !== "pen") {
          setIsHovered(false);
        }
      }}
      onFocusCapture={() => {
        setIsFocused(true);
      }}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && containerRef.current?.contains(next)) return;
        setIsFocused(false);
        setTimeout(() => {
          if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
            setOpen(false);
          }
        }, 160);
      }}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed.length > 0 || category !== "all") {
            navigateToSearch(q, category);
          }
        }}
        className={cn(
          "search-idle-shell relative flex h-12 w-full flex-nowrap items-center gap-1.5 sm:gap-2 md:h-14",
          isCompactVisual ? "max-w-[172px] md:max-w-[190px]" : "max-w-full",
        )}
      >
        <div className="relative h-full min-w-0 flex-1">
          <Search
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground transition-opacity duration-200",
              isCompactVisual && "opacity-0",
            )}
            aria-hidden="true"
          />
          <label htmlFor={id} className="sr-only">
            Search NaijaCheck
          </label>
          <input
            ref={inputRef}
            id={id}
            type="search"
            autoComplete="off"
            value={q}
            placeholder={
              isCompactVisual || showTypewriterOverlay || phase === "expanding"
                ? ""
                : STATIC_PLACEHOLDER
            }
            onFocus={() => {
              setIsFocused(true);
              setOpen(true);
              load();
            }}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setActive(-1);
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "ArrowDown") {
                if (dropdownResults.length > 0) {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, dropdownResults.length - 1));
                }
              } else if (e.key === "ArrowUp") {
                if (dropdownResults.length > 0) {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, -1));
                }
              } else if (e.key === "Enter") {
                if (hasDropdown && active >= 0 && dropdownResults[active]) {
                  e.preventDefault();
                  const targetPath = dropdownResults[active].path;
                  setOpen(false);
                  setActive(-1);
                  setQ("");
                  setIsFocused(false);
                  inputRef.current?.blur();
                  router.push(targetPath);
                } else if (trimmed.length > 0 || category !== "all") {
                  e.preventDefault();
                  navigateToSearch(q, category);
                }
              }
            }}
            role="combobox"
            aria-expanded={hasDropdown ? true : false}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              hasDropdown && active >= 0 && dropdownResults[active] ? `${id}-opt-${active}` : undefined
            }
            className={cn(
              "h-12 w-full rounded-full border-2 bg-card pl-11 pr-3 text-base shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pl-12 sm:pr-4 md:h-14",
              isCompactVisual
                ? "cursor-pointer border-primary/35 caret-transparent"
                : "border-input",
            )}
          />

          {/* Compact idle visual cue: small lens + cradling hands SVG + glowing "Search" */}
          {isCompactVisual ? (
            <div
              aria-hidden="true"
              className="search-compact-cue pointer-events-none absolute inset-0 flex items-center justify-center gap-2 px-4"
            >
              <CompactLensHandsCue />
              <span className="search-glow text-sm font-semibold tracking-tight text-primary">
                Search
              </span>
            </div>
          ) : null}

          {/* Decorative typewriter + bouncing dots overlay (never touches real input value) */}
          {showTypewriterOverlay ? (
            <div
              aria-hidden="true"
              className={cn(
                "search-idle-overlay pointer-events-none absolute inset-y-1 left-11 right-3 flex items-center gap-1.5 overflow-hidden rounded-r-full bg-card pr-2 text-sm text-muted-foreground transition-opacity duration-250 sm:left-12 sm:right-4",
                phase === "fading" ? "opacity-0" : "opacity-100",
              )}
            >
              {phase !== "dots-only" ? (
                <span className="truncate italic text-muted-foreground/90">
                  {typed}
                  {phase === "typing" ? (
                    <span
                      className="search-cursor ml-0.5 inline-block h-4 w-[1.5px] bg-primary align-middle"
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
              ) : null}

              {phase === "dots-with-text" || phase === "dots-only" ? (
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1",
                    phase === "dots-only" ? "pl-0.5" : "ml-0.5",
                  )}
                >
                  <span className="search-dot size-1.5 rounded-full bg-primary" />
                  <span className="search-dot size-1.5 rounded-full bg-primary [animation-delay:150ms]" />
                  <span className="search-dot size-1.5 rounded-full bg-primary [animation-delay:300ms]" />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Category filter beside search — compact select, >=44px touch height */}
        <div
          className={cn(
            "search-idle-accessory flex shrink-0 items-center overflow-hidden transition-all duration-300 ease-out",
            isCompactVisual
              ? "pointer-events-none -ml-1.5 max-w-0 opacity-0 sm:-ml-2"
              : "max-w-[160px] opacity-100",
          )}
        >
          <label htmlFor={`${id}-filter`} className="sr-only">
            Filter by category
          </label>
          <select
            id={`${id}-filter`}
            value={category}
            tabIndex={isCompactVisual ? -1 : 0}
            onChange={(e) => {
              setCategory(e.target.value);
              setOpen(true);
              load();
              inputRef.current?.focus();
            }}
            onFocus={() => {
              setIsFocused(true);
              load();
            }}
            className={cn(
              "h-12 min-h-11 w-[96px] truncate rounded-full border-2 bg-card px-3 pr-7 text-xs font-medium shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:min-w-[124px] sm:px-4 sm:pr-8 sm:text-sm md:h-14",
              category !== "all" ? "border-primary text-primary" : "border-input",
            )}
            aria-label="Filter by category"
          >
            {SEARCH_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Visible Search submit action — >=44px touch target */}
        <button
          type="submit"
          tabIndex={isCompactVisual ? -1 : 0}
          className={cn(
            "search-idle-accessory inline-flex h-12 min-h-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-300 ease-out hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-14",
            isCompactVisual
              ? "pointer-events-none -ml-1.5 max-w-0 min-w-0 px-0 opacity-0 sm:-ml-2"
              : "min-w-11 max-w-[110px] px-3.5 opacity-100 sm:px-5",
          )}
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
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[50vh] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl sm:max-h-96"
        >
          {!index && !failed ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Loading search…</p>
          ) : null}
          {failed ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Search is unavailable right now. Try the navigation menu.
            </p>
          ) : null}

          {/* Popular section hubs — All + empty */}
          {showPopular ? (
            <div className="space-y-1 p-1">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Top sections
              </p>
              {popular.map((p) => (
                <Link
                  key={p.path}
                  href={p.path}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-secondary"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    setIsFocused(false);
                  }}
                >
                  <span className="font-medium">{p.label}</span>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {KIND_LABEL[p.kind] ?? p.kind}
                  </span>
                </Link>
              ))}
              <p className="px-2 py-1 text-xs text-muted-foreground">
                Dropdown shows section hubs — press <strong>Enter</strong> to search all 1,050+ deep pages.
              </p>
            </div>
          ) : null}

          {/* Category filter + empty query: shallow section hub ONLY + Enter for deep list */}
          {showBrowse ? (
            <div className="space-y-1 p-0.5">
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {activeCategoryLabel} — section home
              </p>
              {dropdownResults.map((r, i) => (
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    setIsFocused(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.desc}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {KIND_LABEL[r.kind] ?? r.kind}
                  </span>
                </Link>
              ))}
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => navigateToSearch("", category)}
                  className="w-full text-left font-semibold text-primary hover:underline"
                >
                  Press Enter for full {activeCategoryLabel} list ({deepMatchCount} pages) →
                </button>
              </div>
            </div>
          ) : null}

          {/* Typed query: shallow top-level hub results ONLY + Enter for deep omni search */}
          {showResults ? (
            <>
              {index && dropdownResults.length === 0 ? (
                <div className="px-3 py-3 text-sm">
                  <p className="font-medium">
                    No top-level section matches “{trimmed}”
                    {category !== "all" ? ` in ${activeCategoryLabel}` : ""}.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Press Enter to run full deep search across banks, postal codes, 774 LGAs, charts &amp; cities.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => navigateToSearch(q, category)}
                      className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Search all pages for “{trimmed}” →
                    </button>
                    {category !== "all" ? (
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => navigateToSearch(q, "all")}
                        className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary"
                      >
                        Search in All categories
                      </button>
                    ) : null}
                    <Link
                      href="/codes"
                      onClick={() => setOpen(false)}
                      className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary"
                    >
                      Codes hub
                    </Link>
                    <Link
                      href="/geo"
                      onClick={() => setOpen(false)}
                      className="rounded-full border px-2.5 py-1 text-xs hover:bg-secondary"
                    >
                      774 LGAs
                    </Link>
                  </div>
                </div>
              ) : null}

              {dropdownResults.map((r, i) => (
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    setQ("");
                    setIsFocused(false);
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.desc}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {KIND_LABEL[r.kind] ?? r.kind}
                  </span>
                </Link>
              ))}

              {dropdownResults.length > 0 ? (
                <div className="mt-0.5 border-t pt-1">
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-secondary"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => navigateToSearch(q, category)}
                  >
                    Press Enter for full deep results for “{trimmed}”
                    {deepMatchCount > 0 ? ` (${deepMatchCount} match${deepMatchCount === 1 ? "" : "es"})` : ""} →
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
