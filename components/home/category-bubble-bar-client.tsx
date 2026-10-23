"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Banknote,
  ChevronDown,
  FileText,
  Hash,
  MapPin,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CategoryBubble,
  CategoryBubbleIconName,
} from "@/lib/category-bubbles";
import { createCategoryBubbleController } from "@/lib/category-bubble-controller";

const BUBBLE_ICON_MAP: Record<
  CategoryBubbleIconName,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>
> = {
  banknote: Banknote,
  hash: Hash,
  "map-pin": MapPin,
  "file-text": FileText,
  "message-circle": MessageCircle,
  wrench: Wrench,
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/**
 * Interactive client strip for the minimal 6-bubble main-hub bar (home-first).
 *  - Renders strictly on `/` (returns `null` on deep guides/articles so long pages lose zero vertical space).
 *  - Slow gentle horizontal drift when idle; pauses on hover, touch, focus, open panel, or `prefers-reduced-motion: reduce`.
 *  - Supports manual horizontal touch-scroll and mouse drag in both directions.
 *  - Opens opaque, elevated 2-level subcategory panels and auto-closes ~10s after the user leaves both bar & panel.
 */
export function CategoryBubbleBarClient({
  bubbles,
}: {
  bubbles: readonly CategoryBubble[];
}) {
  const pathname = usePathname();
  const isHome = !pathname || pathname === "/";
  const isReducedMotion = usePrefersReducedMotion();

  const controllerRef = React.useRef<ReturnType<typeof createCategoryBubbleController> | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = createCategoryBubbleController({ bubbles });
  }
  const ctrl = controllerRef.current;

  const snapshot = React.useSyncExternalStore(
    ctrl.subscribe,
    ctrl.getSnapshot,
    ctrl.getSnapshot,
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const pillRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const driftDirectionRef = React.useRef<1 | -1>(1);
  const driftCarryRef = React.useRef(0);
  const touchSettleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStateRef = React.useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startScrollLeft: number;
  }>({ active: false, moved: false, startX: 0, startScrollLeft: 0 });
  const suppressClickRef = React.useRef(false);

  const [panelLeftPx, setPanelLeftPx] = React.useState<number | null>(null);

  // Sync reduced-motion & document visibility with controller
  React.useEffect(() => {
    ctrl.updateEngagement({ reducedMotion: isReducedMotion });
  }, [ctrl, isReducedMotion]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      ctrl.updateEngagement({ tabHidden: document.visibilityState === "hidden" });
    };
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [ctrl]);

  // Clean up controller timers on unmount
  React.useEffect(() => {
    return () => {
      if (touchSettleTimerRef.current) clearTimeout(touchSettleTimerRef.current);
    };
  }, []);

  // Close open panels on client route navigation
  const prevPathRef = React.useRef(pathname);
  React.useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      ctrl.closeAll();
      ctrl.updateEngagement({ pointerInside: false, focusInside: false, touchActive: false });
    }
  }, [pathname, ctrl]);

  // Click / tap outside closes open panel immediately
  React.useEffect(() => {
    if (!snapshot.openCategoryId) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) {
        ctrl.updateEngagement({ pointerInside: false, focusInside: false, touchActive: false });
        ctrl.closeAll();
      }
    };
    document.addEventListener("pointerdown", onPointerDownOutside);
    return () => document.removeEventListener("pointerdown", onPointerDownOutside);
  }, [snapshot.openCategoryId, ctrl]);

  // Position desktop dropdown neatly beneath the active bubble pill without overflowing viewport
  const updatePanelAnchor = React.useCallback(() => {
    if (!snapshot.openCategoryId || typeof window === "undefined") {
      setPanelLeftPx(null);
      return;
    }
    if (window.innerWidth < 640) {
      setPanelLeftPx(null);
      return;
    }
    const root = rootRef.current;
    const pill = pillRefs.current[snapshot.openCategoryId];
    if (!root || !pill) {
      setPanelLeftPx(null);
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const panelWidth = 368; // sm:w-[23rem] = 368px
    const rawLeft = pillRect.left - rootRect.left;
    const maxLeft = Math.max(12, rootRect.width - panelWidth - 12);
    setPanelLeftPx(Math.min(Math.max(12, rawLeft), maxLeft));
  }, [snapshot.openCategoryId]);

  React.useEffect(() => {
    updatePanelAnchor();
    if (!snapshot.openCategoryId || typeof window === "undefined") return;
    window.addEventListener("resize", updatePanelAnchor);
    return () => window.removeEventListener("resize", updatePanelAnchor);
  }, [snapshot.openCategoryId, updatePanelAnchor]);

  // Gentle low-CPU horizontal auto-drift (~20 ticks/sec, ~13px/sec) when idle & allowed
  React.useEffect(() => {
    if (!isHome || !snapshot.canAutoDrift) return;
    const stepMs = 50;
    const pxPerStep = 0.65; // ~13px/sec calm ticker-like drift
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 2) return;
      driftCarryRef.current += pxPerStep * driftDirectionRef.current;
      const wholePx = Math.trunc(driftCarryRef.current);
      if (wholePx === 0) return;
      driftCarryRef.current -= wholePx;
      const next = el.scrollLeft + wholePx;
      if (next >= maxScroll) {
        el.scrollLeft = maxScroll;
        driftDirectionRef.current = -1;
        driftCarryRef.current = 0;
      } else if (next <= 0) {
        el.scrollLeft = 0;
        driftDirectionRef.current = 1;
        driftCarryRef.current = 0;
      } else {
        el.scrollLeft = next;
      }
    }, stepMs);
    return () => clearInterval(id);
  }, [isHome, snapshot.canAutoDrift]);

  // Home-first placement: render strictly on `/` so long guides/articles lose zero vertical space
  if (!isHome) return null;

  const openBubble = snapshot.openCategoryId
    ? bubbles.find((b) => b.id === snapshot.openCategoryId) ?? null
    : null;
  const expandedSet = new Set(snapshot.expandedSubcategoryIds);

  return (
    <div
      ref={rootRef}
      role="navigation"
      aria-label="Main hub categories"
      data-category-bubble-bar="true"
      data-drift-state={
        isReducedMotion
          ? "reduced-motion"
          : snapshot.canAutoDrift
            ? "drifting"
            : "paused"
      }
      data-open-category={snapshot.openCategoryId ?? ""}
      className="relative z-[38] -mx-4 -mt-6 mb-4 border-b bg-background/95 lg:mx-0 lg:-mt-2 lg:mb-5 lg:rounded-xl lg:border lg:bg-card/70"
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") {
          ctrl.updateEngagement({ pointerInside: true });
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") {
          ctrl.updateEngagement({ pointerInside: false });
        }
      }}
      onFocusCapture={() => {
        ctrl.updateEngagement({ focusInside: true });
      }}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (next && rootRef.current?.contains(next)) return;
        ctrl.updateEngagement({ focusInside: false });
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && snapshot.openCategoryId) {
          e.preventDefault();
          const activeId = snapshot.openCategoryId;
          ctrl.closeAll();
          pillRefs.current[activeId]?.focus();
        }
      }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Slim 44px horizontal scrollable + draggable bubble rail */}
        <div
          ref={scrollerRef}
          onScroll={() => {
            if (snapshot.openCategoryId) updatePanelAnchor();
          }}
          onTouchStart={() => {
            if (touchSettleTimerRef.current) clearTimeout(touchSettleTimerRef.current);
            ctrl.updateEngagement({ touchActive: true });
          }}
          onTouchEnd={() => {
            if (touchSettleTimerRef.current) clearTimeout(touchSettleTimerRef.current);
            touchSettleTimerRef.current = setTimeout(() => {
              ctrl.updateEngagement({ touchActive: false });
            }, 850);
          }}
          onTouchCancel={() => {
            if (touchSettleTimerRef.current) clearTimeout(touchSettleTimerRef.current);
            ctrl.updateEngagement({ touchActive: false });
          }}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            const scroller = scrollerRef.current;
            if (!scroller) return;
            dragStateRef.current = {
              active: true,
              moved: false,
              startX: e.clientX,
              startScrollLeft: scroller.scrollLeft,
            };
          }}
          onPointerMove={(e) => {
            const drag = dragStateRef.current;
            const scroller = scrollerRef.current;
            if (!drag.active || !scroller) return;
            const dx = e.clientX - drag.startX;
            if (Math.abs(dx) > 6) {
              drag.moved = true;
              suppressClickRef.current = true;
              scroller.scrollLeft = drag.startScrollLeft - dx;
            }
          }}
          onPointerUp={() => {
            dragStateRef.current.active = false;
          }}
          onPointerCancel={() => {
            dragStateRef.current.active = false;
          }}
          className="nc-bubble-scroller flex h-11 items-center overflow-x-auto touch-pan-x"
        >
          <div
            className={cn(
              "nc-bubble-track mx-auto flex items-center gap-2 px-4 sm:gap-2.5",
              !isReducedMotion && "min-w-[calc(100%+88px)] justify-between",
            )}
          >
            {bubbles.map((bubble, idx) => {
              const Icon = BUBBLE_ICON_MAP[bubble.icon];
              const isOpen = snapshot.openCategoryId === bubble.id;
              const panelId = `nc-bubble-panel-${bubble.id}`;
              return (
                <button
                  key={bubble.id}
                  ref={(el) => {
                    pillRefs.current[bubble.id] = el;
                  }}
                  type="button"
                  data-bubble-id={bubble.id}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={`${bubble.label}, ${isOpen ? "close" : "open"} menu`}
                  onClick={(e) => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      e.preventDefault();
                      return;
                    }
                    ctrl.toggleCategory(bubble.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      const next = bubbles[(idx + 1) % bubbles.length];
                      pillRefs.current[next.id]?.focus();
                    } else if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      const prev = bubbles[(idx - 1 + bubbles.length) % bubbles.length];
                      pillRefs.current[prev.id]?.focus();
                    } else if (e.key === "ArrowDown" && isOpen) {
                      e.preventDefault();
                      const firstInteractive = panelRef.current?.querySelector<HTMLElement>(
                        "a[href], button:not([disabled])",
                      );
                      firstInteractive?.focus();
                    }
                  }}
                  className={cn(
                    "nc-bubble-pill inline-flex h-8.5 min-h-[34px] shrink-0 select-none items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[13px]",
                    isOpen
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-secondary",
                  )}
                >
                  {/* 1) Small relevant icon immediately before the name */}
                  <Icon
                    data-bubble-part="icon"
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {/* 2) Category name */}
                  <span data-bubble-part="label">{bubble.label}</span>
                  {/* 3) Dropdown chevron immediately after the name */}
                  <ChevronDown
                    data-bubble-part="chevron"
                    className={cn(
                      "nc-bubble-chevron size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180 text-primary",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Opaque, elevated subcategory dropdown panel (sibling of overflow-x-auto scroller so never clipped) */}
      {openBubble ? (
        <div className="mx-auto max-w-7xl">
          <div
            ref={panelRef}
            id={`nc-bubble-panel-${openBubble.id}`}
            role="region"
            aria-label={`${openBubble.label} subcategories`}
            style={panelLeftPx !== null ? { left: `${panelLeftPx}px` } : undefined}
            className="nc-bubble-dropdown-panel absolute left-3 right-3 top-full z-50 mt-1.5 max-h-[min(68vh,26rem)] overflow-y-auto overscroll-contain rounded-2xl border-2 border-border bg-popover p-2.5 text-popover-foreground shadow-2xl ring-1 ring-black/10 dark:ring-white/15 sm:right-auto sm:w-[23rem]"
          >
            {/* Root hub shortcut row */}
            <div className="mb-1.5 flex items-center justify-between gap-2 border-b border-border pb-2 px-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {openBubble.label}
              </span>
              <Link
                href={openBubble.hubHref}
                onClick={() => ctrl.closeAll()}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{openBubble.hubLabel}</span>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>

            <ul className="space-y-1">
              {openBubble.subcategories.map((sub) => {
                const hasChildren = Boolean(sub.children && sub.children.length > 0);
                const isSubOpen = hasChildren && expandedSet.has(sub.id);
                const subListId = `nc-bubble-sub-${sub.id}`;

                if (!hasChildren) {
                  // Direct 1-level subcategory link — NO nested chevron
                  return (
                    <li key={sub.id}>
                      <Link
                        href={sub.href}
                        onClick={() => ctrl.closeAll()}
                        className="flex min-h-10 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate">{sub.label}</span>
                        {sub.meta ? (
                          <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            {sub.meta}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                }

                // 2-level group with real SSOT children — renders nested chevron
                return (
                  <li key={sub.id} className="rounded-xl border border-border/70 bg-card/60">
                    <button
                      type="button"
                      data-sub-id={sub.id}
                      aria-expanded={isSubOpen}
                      aria-controls={subListId}
                      aria-label={`${sub.label}, ${isSubOpen ? "collapse" : "expand"} subcategory`}
                      onClick={() => ctrl.toggleSubcategory(sub.id)}
                      className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="truncate">{sub.label}</span>
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        {sub.meta ? (
                          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {sub.meta}
                          </span>
                        ) : null}
                        <ChevronDown
                          data-nested-chevron="true"
                          className={cn(
                            "nc-bubble-chevron size-4 text-muted-foreground transition-transform duration-200",
                            isSubOpen && "rotate-180 text-primary",
                          )}
                          aria-hidden="true"
                        />
                      </span>
                    </button>

                    {isSubOpen ? (
                      <ul
                        id={subListId}
                        className="space-y-0.5 border-t border-border/60 px-1.5 py-1.5"
                      >
                        {sub.children!.map((leaf) => (
                          <li key={`${sub.id}-${leaf.href}-${leaf.label}`}>
                            <Link
                              href={leaf.href}
                              onClick={() => ctrl.closeAll()}
                              className="flex min-h-9 items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <span className="truncate">{leaf.label}</span>
                              {leaf.meta ? (
                                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                                  {leaf.meta}
                                </span>
                              ) : null}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
