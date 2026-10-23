import type { CategoryBubble, CategoryBubbleId } from "./category-bubbles";

/**
 * Deterministic controller for the minimal 6-bubble category bar:
 *  - Tracks open category panel (`openCategoryId`) and open nested subgroups (`expandedSubcategoryIds`).
 *  - Computes `canAutoDrift` (pauses on hover, touch, focus, open panel, hidden tab, or `prefers-reduced-motion: reduce`).
 *  - Manages the 10-second auto-close timer (`CATEGORY_PANEL_AUTO_CLOSE_MS = 10_000`) whenever focus/pointer/touch
 *    leaves BOTH the bubble bar and the open dropdown panel; cancels/restarts cleanly on re-entry.
 */

export const CATEGORY_PANEL_AUTO_CLOSE_MS = 10_000 as const;

export type BubbleBarEngagement = {
  reducedMotion: boolean;
  pointerInside: boolean;
  focusInside: boolean;
  touchActive: boolean;
  tabHidden: boolean;
};

export type BubbleBarSnapshot = {
  openCategoryId: CategoryBubbleId | null;
  expandedSubcategoryIds: readonly string[];
  canAutoDrift: boolean;
  autoCloseArmed: boolean;
  reducedMotion: boolean;
};

export type BubbleTimerScheduler = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const DEFAULT_SCHEDULER: BubbleTimerScheduler = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
};

export function computeCanAutoDrift(
  e: BubbleBarEngagement,
  openCategoryId: CategoryBubbleId | null,
): boolean {
  return (
    !e.reducedMotion &&
    !e.tabHidden &&
    !e.pointerInside &&
    !e.focusInside &&
    !e.touchActive &&
    openCategoryId === null
  );
}

export function isUserInsideBarOrPanel(e: BubbleBarEngagement): boolean {
  return e.pointerInside || e.focusInside || e.touchActive;
}

export function createCategoryBubbleController(opts: {
  bubbles: readonly CategoryBubble[];
  scheduler?: BubbleTimerScheduler;
  autoCloseMs?: number;
  initialEngagement?: Partial<BubbleBarEngagement>;
}) {
  const scheduler = opts.scheduler ?? DEFAULT_SCHEDULER;
  const autoCloseMs = opts.autoCloseMs ?? CATEGORY_PANEL_AUTO_CLOSE_MS;
  const bubbleMap = new Map<CategoryBubbleId, CategoryBubble>(
    opts.bubbles.map((b) => [b.id, b]),
  );

  let engagement: BubbleBarEngagement = {
    reducedMotion: false,
    pointerInside: false,
    focusInside: false,
    touchActive: false,
    tabHidden: false,
    ...(opts.initialEngagement ?? {}),
  };

  let openCategoryId: CategoryBubbleId | null = null;
  let expandedSet = new Set<string>();
  let autoCloseTimer: unknown = undefined;
  const listeners = new Set<() => void>();

  const buildSnapshot = (): BubbleBarSnapshot => ({
    openCategoryId,
    expandedSubcategoryIds: [...expandedSet],
    canAutoDrift: computeCanAutoDrift(engagement, openCategoryId),
    autoCloseArmed: autoCloseTimer !== undefined,
    reducedMotion: engagement.reducedMotion,
  });

  let snapshot: BubbleBarSnapshot = buildSnapshot();

  const clearAutoCloseTimer = () => {
    if (autoCloseTimer !== undefined) {
      scheduler.clearTimeout(autoCloseTimer);
      autoCloseTimer = undefined;
    }
  };

  const emitIfChanged = () => {
    const next = buildSnapshot();
    const sameExpanded =
      next.expandedSubcategoryIds.length === snapshot.expandedSubcategoryIds.length &&
      next.expandedSubcategoryIds.every((id, i) => id === snapshot.expandedSubcategoryIds[i]);
    if (
      next.openCategoryId === snapshot.openCategoryId &&
      sameExpanded &&
      next.canAutoDrift === snapshot.canAutoDrift &&
      next.autoCloseArmed === snapshot.autoCloseArmed &&
      next.reducedMotion === snapshot.reducedMotion
    ) {
      return;
    }
    snapshot = next;
    for (const l of listeners) l();
  };

  const reconcileAutoCloseTimer = (restartIfOutside = false) => {
    if (openCategoryId === null) {
      clearAutoCloseTimer();
      return;
    }
    if (isUserInsideBarOrPanel(engagement)) {
      // User is actively inside bar or panel -> cancel any countdown
      clearAutoCloseTimer();
      return;
    }
    // Panel is open and user is outside both bar and panel -> arm 10s countdown
    if (restartIfOutside) {
      clearAutoCloseTimer();
    }
    if (autoCloseTimer === undefined) {
      autoCloseTimer = scheduler.setTimeout(() => {
        autoCloseTimer = undefined;
        openCategoryId = null;
        expandedSet = new Set<string>();
        emitIfChanged();
      }, autoCloseMs);
    }
  };

  const defaultExpandedFor = (id: CategoryBubbleId): Set<string> => {
    const b = bubbleMap.get(id);
    if (!b) return new Set<string>();
    const out = new Set<string>();
    for (const sub of b.subcategories) {
      if (sub.defaultExpanded && sub.children && sub.children.length > 0) {
        out.add(sub.id);
      }
    }
    return out;
  };

  return {
    getSnapshot(): BubbleBarSnapshot {
      return snapshot;
    },
    getEngagement(): BubbleBarEngagement {
      return { ...engagement };
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    toggleCategory(id: CategoryBubbleId) {
      if (!bubbleMap.has(id)) return;
      if (openCategoryId === id) {
        openCategoryId = null;
        expandedSet = new Set<string>();
        clearAutoCloseTimer();
      } else {
        openCategoryId = id;
        expandedSet = defaultExpandedFor(id);
        reconcileAutoCloseTimer(true);
      }
      emitIfChanged();
    },
    toggleSubcategory(subId: string) {
      if (!openCategoryId) return;
      const bubble = bubbleMap.get(openCategoryId);
      const sub = bubble?.subcategories.find((s) => s.id === subId);
      if (!sub || !sub.children || sub.children.length === 0) return;
      const next = new Set(expandedSet);
      if (next.has(subId)) {
        next.delete(subId);
      } else {
        next.add(subId);
      }
      expandedSet = next;
      reconcileAutoCloseTimer(false);
      emitIfChanged();
    },
    closeAll() {
      if (openCategoryId === null && expandedSet.size === 0 && autoCloseTimer === undefined) return;
      openCategoryId = null;
      expandedSet = new Set<string>();
      clearAutoCloseTimer();
      emitIfChanged();
    },
    updateEngagement(patch: Partial<BubbleBarEngagement>) {
      const wasInside = isUserInsideBarOrPanel(engagement);
      engagement = { ...engagement, ...patch };
      const nowInside = isUserInsideBarOrPanel(engagement);
      reconcileAutoCloseTimer(wasInside && !nowInside);
      emitIfChanged();
    },
    destroy() {
      clearAutoCloseTimer();
      listeners.clear();
    },
  };
}
