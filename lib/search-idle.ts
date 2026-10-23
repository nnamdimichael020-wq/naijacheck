import { IDLE_TIP_POOL } from "./search-tips";

/**
 * Deterministic state machine for the header idle search-bar animation
 * and user-controlled search-chrome collapse persistence.
 *
 * Cycle shape (IDLE_TIPS_PER_BURST = 3):
 *   1. Compact lens + "Search" -> smooth ~420ms expand
 *   2. Tip A: typewriter -> dots-with-text -> dots-only -> brief fade
 *   3. Immediately Tip B (distinct from A): typewriter -> dots-with-text -> dots-only -> brief fade
 *   4. Immediately Tip C (distinct from A & B): typewriter -> dots-with-text -> dots-only -> brief fade
 *   5. Collapse smoothly to compact lens + "Search"
 *   6. Wait ~5,000ms cool-off
 *   7. Expand again and repeat with 3 new tips from the 1,196-item SSOT pool
 */

export const SEARCH_CHROME_STORAGE_KEY = "naijacheck.searchChrome" as const;
export const SEARCH_CHROME_SYNC_EVENT = "naijacheck:search-chrome" as const;
export type SearchChromeState = "expanded" | "collapsed";

export function parseSearchChromeState(raw: string | null | undefined): SearchChromeState {
  return raw === "collapsed" ? "collapsed" : "expanded";
}

export function readSearchChromePreference(
  storage?: Pick<Storage, "getItem"> | null,
): SearchChromeState {
  try {
    const s =
      storage !== undefined
        ? storage
        : typeof window !== "undefined"
          ? window.localStorage
          : null;
    return parseSearchChromeState(s?.getItem(SEARCH_CHROME_STORAGE_KEY));
  } catch {
    return "expanded";
  }
}

export function writeSearchChromePreference(
  next: SearchChromeState,
  storage?: Pick<Storage, "setItem"> | null,
): void {
  try {
    const s =
      storage !== undefined
        ? storage
        : typeof window !== "undefined"
          ? window.localStorage
          : null;
    s?.setItem(SEARCH_CHROME_STORAGE_KEY, next);
  } catch {
    // Ignore private-mode / quota storage errors gracefully
  }
}

export const IDLE_TIPS_PER_BURST = 3 as const;

export type IdlePhase =
  | "reduced-motion" // prefers-reduced-motion: reduce -> static full bar, zero timers
  | "collapsed" // user collapsed search chrome -> compact chip, zero timers
  | "active" // engaged (focused / hovered / typing / open panel / SSR) -> static full bar
  | "compact-initial" // Initial compact lens + hands cue + glowing "Search"
  | "expanding" // Smooth ~420ms expand to full bar width
  | "typing" // Typewriter reveals real-topic tip char-by-char
  | "dots-with-text" // Completed line + three bouncing dots
  | "dots-only" // Simplify to three bouncing dots only (demo text cleared)
  | "fading" // Brief fade out before next tip in burst or before collapsing
  | "collapsing" // Collapse back to compact lens + glowing "Search" after 3 tips
  | "compact-wait"; // Rest ~5s in compact state before expanding with 3 new tips

export type SearchIdleSnapshot = {
  phase: IdlePhase;
  typed: string;
  suggestionIndex: number;
  /** 0, 1, or 2 indicating which tip within the 3-tip burst is running. */
  burstStep: number;
  currentTip: string;
  isCompactVisual: boolean;
  showTypewriterOverlay: boolean;
};

export type SearchIdleEngagement = {
  reducedMotion: boolean;
  chromeCollapsed: boolean;
  focused: boolean;
  hovered: boolean;
  hasInput: boolean;
  panelOpen: boolean;
  tabHidden: boolean;
};

export type IdleScheduler = {
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export const IDLE_SEARCH_TIMINGS = {
  compactInitialMs: 950,
  expandMs: 420,
  typeFirstCharDelayMs: 80,
  typeCharIntervalMs: 50,
  afterTypedHoldMs: 220,
  dotsWithTextMs: 950,
  dotsOnlyMs: 750,
  fadeMs: 260,
  collapseMs: 420,
  compactWaitMs: 5000,
} as const;

export type SearchIdleTimings = typeof IDLE_SEARCH_TIMINGS;

const DEFAULT_SCHEDULER: IdleScheduler = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
};

export const INITIAL_IDLE_SNAPSHOT: SearchIdleSnapshot = {
  phase: "active",
  typed: "",
  suggestionIndex: 0,
  burstStep: 0,
  currentTip: "",
  isCompactVisual: false,
  showTypewriterOverlay: false,
};

export function canRunIdleAnimation(e: SearchIdleEngagement): boolean {
  return (
    !e.reducedMotion &&
    !e.chromeCollapsed &&
    !e.focused &&
    !e.hovered &&
    !e.hasInput &&
    !e.panelOpen &&
    !e.tabHidden
  );
}

function buildSnapshot(
  phase: IdlePhase,
  typed: string,
  suggestionIndex: number,
  burstStep: number,
  currentTip: string,
): SearchIdleSnapshot {
  const isCompactVisual =
    phase === "compact-initial" || phase === "collapsing" || phase === "compact-wait";
  const showTypewriterOverlay =
    phase === "typing" || phase === "dots-with-text" || phase === "dots-only" || phase === "fading";
  return {
    phase,
    typed,
    suggestionIndex,
    burstStep,
    currentTip,
    isCompactVisual,
    showTypewriterOverlay,
  };
}

export function createSearchIdleController(opts?: {
  scheduler?: IdleScheduler;
  timings?: Partial<SearchIdleTimings>;
  tips?: readonly string[];
  tipsPerBurst?: number;
}) {
  const scheduler = opts?.scheduler ?? DEFAULT_SCHEDULER;
  const timings: SearchIdleTimings = { ...IDLE_SEARCH_TIMINGS, ...(opts?.timings ?? {}) };
  let tips: readonly string[] = opts?.tips && opts.tips.length > 0 ? opts.tips : IDLE_TIP_POOL;
  const tipsPerBurst = Math.max(1, opts?.tipsPerBurst ?? IDLE_TIPS_PER_BURST);

  let started = false;
  let timer: unknown = undefined;
  let suggestionIndex = 0;
  let burstStep = 0;
  let engagement: SearchIdleEngagement = {
    reducedMotion: false,
    chromeCollapsed: false,
    focused: false,
    hovered: false,
    hasInput: false,
    panelOpen: false,
    tabHidden: false,
  };
  let snapshot: SearchIdleSnapshot = INITIAL_IDLE_SNAPSHOT;
  const listeners = new Set<() => void>();

  const clearPending = () => {
    if (timer !== undefined) {
      scheduler.clearTimeout(timer);
      timer = undefined;
    }
  };

  const currentTipAt = (idx: number) => tips[idx % tips.length] ?? "";

  const emit = (nextPhase: IdlePhase, nextTyped: string, tipText = "") => {
    if (
      snapshot.phase === nextPhase &&
      snapshot.typed === nextTyped &&
      snapshot.suggestionIndex === suggestionIndex &&
      snapshot.burstStep === burstStep &&
      snapshot.currentTip === tipText
    ) {
      return;
    }
    snapshot = buildSnapshot(nextPhase, nextTyped, suggestionIndex, burstStep, tipText);
    for (const l of listeners) l();
  };

  const wait = (ms: number, fn: () => void) => {
    clearPending();
    timer = scheduler.setTimeout(() => {
      timer = undefined;
      if (!started || !canRunIdleAnimation(engagement)) return;
      fn();
    }, ms);
  };

  const runSingleTipInBurst = () => {
    const text = currentTipAt(suggestionIndex);
    let pos = 0;
    emit("typing", "", text);

    const nextChar = () => {
      pos += 1;
      const slice = text.slice(0, pos);
      emit("typing", slice, text);
      if (pos < text.length) {
        wait(timings.typeCharIntervalMs, nextChar);
      } else {
        wait(timings.afterTypedHoldMs, () => {
          // Append three bouncing dots to completed line
          emit("dots-with-text", text, text);
          wait(timings.dotsWithTextMs, () => {
            // Simplify to dots-only bounce briefly
            emit("dots-only", "", text);
            wait(timings.dotsOnlyMs, () => {
              // Brief fade out
              emit("fading", "", text);
              wait(timings.fadeMs, () => {
                if (burstStep + 1 < tipsPerBurst) {
                  // Immediately run the NEXT distinct tip in this 3-tip burst (no collapse yet!)
                  burstStep += 1;
                  suggestionIndex = (suggestionIndex + 1) % tips.length;
                  runSingleTipInBurst();
                } else {
                  // Completed all 3 tips -> collapse to compact lens + "Search", wait ~5s, then 3 new tips
                  emit("collapsing", "", "");
                  wait(timings.collapseMs, () => {
                    emit("compact-wait", "", "");
                    wait(timings.compactWaitMs, () => {
                      burstStep = 0;
                      suggestionIndex = (suggestionIndex + 1) % tips.length;
                      emit("expanding", "", "");
                      wait(timings.expandMs, runSingleTipInBurst);
                    });
                  });
                }
              });
            });
          });
        });
      }
    };

    wait(timings.typeFirstCharDelayMs, nextChar);
  };

  const startCycleFromCompact = () => {
    burstStep = 0;
    emit("compact-initial", "", "");
    wait(timings.compactInitialMs, () => {
      emit("expanding", "", "");
      wait(timings.expandMs, runSingleTipInBurst);
    });
  };

  const sync = () => {
    if (!started) return;
    if (engagement.chromeCollapsed) {
      clearPending();
      burstStep = 0;
      emit("collapsed", "", "");
      return;
    }
    if (engagement.reducedMotion) {
      clearPending();
      burstStep = 0;
      emit("reduced-motion", "", "");
      return;
    }
    if (!canRunIdleAnimation(engagement)) {
      clearPending();
      burstStep = 0;
      emit("active", "", "");
      return;
    }
    // Transitioning from paused/collapsed/initial into idle: begin compact -> expand -> 3-tip burst
    if (
      snapshot.phase === "active" ||
      snapshot.phase === "reduced-motion" ||
      snapshot.phase === "collapsed"
    ) {
      startCycleFromCompact();
    }
  };

  return {
    getSnapshot(): SearchIdleSnapshot {
      return snapshot;
    },
    getEngagement(): SearchIdleEngagement {
      return { ...engagement };
    },
    getTipCount(): number {
      return tips.length;
    },
    setTips(nextTips: readonly string[]) {
      if (nextTips.length > 0) {
        tips = nextTips;
        suggestionIndex = suggestionIndex % tips.length;
      }
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(initial?: Partial<SearchIdleEngagement>) {
      if (initial) engagement = { ...engagement, ...initial };
      started = true;
      sync();
    },
    stop() {
      started = false;
      clearPending();
    },
    updateEngagement(patch: Partial<SearchIdleEngagement>) {
      engagement = { ...engagement, ...patch };
      sync();
    },
    notifyNavigation() {
      suggestionIndex = (suggestionIndex + 1) % tips.length;
      burstStep = 0;
      if (!started) return;
      if (canRunIdleAnimation(engagement)) {
        clearPending();
        startCycleFromCompact();
      } else {
        sync();
      }
    },
  };
}
