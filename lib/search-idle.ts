import { SEARCH_SUGGESTIONS, type SearchSuggestion } from "./search";

/**
 * Deterministic state machine for the header idle search-bar animation.
 *
 * Separating the timing/pause rules from React DOM bindings lets unit tests step
 * through every millisecond with a fake clock (verifying compact -> expand ->
 * typewriter -> dots-with-text -> dots-only -> fade -> collapse -> 5s wait ->
 * rotated suggestion, plus focus/hover/typing/panel/reduced-motion pause rules)
 * without flakiness or CPU-heavy polling.
 */

export type IdlePhase =
  | "reduced-motion" // prefers-reduced-motion: reduce -> static full bar, zero timers
  | "active" // engaged (focused / hovered / typing / open panel / SSR) -> static full bar
  | "compact-initial" // 1. Initial compact lens + hands cue + glowing "Search"
  | "expanding" // 2. Smooth ~420ms expand to full bar width
  | "typing" // 3. Typewriter reveals real-topic suggestion char-by-char
  | "dots-with-text" // 4a. Completed line + three bouncing dots
  | "dots-only" // 4b. Simplify to three bouncing dots only (demo text cleared)
  | "fading" // 5a. Fade out decorative overlay
  | "collapsing" // 5b. Collapse back to compact lens + glowing "Search"
  | "compact-wait"; // 6. Rest ~5s in compact state before expanding with next suggestion

export type SearchIdleSnapshot = {
  phase: IdlePhase;
  typed: string;
  suggestionIndex: number;
  isCompactVisual: boolean;
  showTypewriterOverlay: boolean;
};

export type SearchIdleEngagement = {
  reducedMotion: boolean;
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
  isCompactVisual: false,
  showTypewriterOverlay: false,
};

export function canRunIdleAnimation(e: SearchIdleEngagement): boolean {
  return !e.reducedMotion && !e.focused && !e.hovered && !e.hasInput && !e.panelOpen && !e.tabHidden;
}

function buildSnapshot(phase: IdlePhase, typed: string, suggestionIndex: number): SearchIdleSnapshot {
  const isCompactVisual =
    phase === "compact-initial" || phase === "collapsing" || phase === "compact-wait";
  const showTypewriterOverlay =
    phase === "typing" || phase === "dots-with-text" || phase === "dots-only" || phase === "fading";
  return {
    phase,
    typed,
    suggestionIndex,
    isCompactVisual,
    showTypewriterOverlay,
  };
}

export function createSearchIdleController(opts?: {
  scheduler?: IdleScheduler;
  timings?: Partial<SearchIdleTimings>;
  suggestions?: readonly SearchSuggestion[];
}) {
  const scheduler = opts?.scheduler ?? DEFAULT_SCHEDULER;
  const timings: SearchIdleTimings = { ...IDLE_SEARCH_TIMINGS, ...(opts?.timings ?? {}) };
  const suggestions = opts?.suggestions && opts.suggestions.length > 0 ? opts.suggestions : SEARCH_SUGGESTIONS;

  let started = false;
  let timer: unknown = undefined;
  let suggestionIndex = 0;
  let engagement: SearchIdleEngagement = {
    reducedMotion: false,
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

  const emit = (nextPhase: IdlePhase, nextTyped: string) => {
    if (
      snapshot.phase === nextPhase &&
      snapshot.typed === nextTyped &&
      snapshot.suggestionIndex === suggestionIndex
    ) {
      return;
    }
    snapshot = buildSnapshot(nextPhase, nextTyped, suggestionIndex);
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

  const runTypewriter = () => {
    const text = suggestions[suggestionIndex % suggestions.length].text;
    let pos = 0;
    emit("typing", "");

    const nextChar = () => {
      pos += 1;
      const slice = text.slice(0, pos);
      emit("typing", slice);
      if (pos < text.length) {
        wait(timings.typeCharIntervalMs, nextChar);
      } else {
        wait(timings.afterTypedHoldMs, () => {
          // Step 4a: append three bouncing dots to completed line
          emit("dots-with-text", text);
          wait(timings.dotsWithTextMs, () => {
            // Step 4b: simplify to dots-only bounce briefly
            emit("dots-only", "");
            wait(timings.dotsOnlyMs, () => {
              // Step 5a: fade out demo overlay
              emit("fading", "");
              wait(timings.fadeMs, () => {
                // Step 5b: collapse smoothly back to compact lens + "Search"
                emit("collapsing", "");
                wait(timings.collapseMs, () => {
                  // Step 6: wait ~5 seconds in compact state
                  emit("compact-wait", "");
                  wait(timings.compactWaitMs, () => {
                    // Step 7: advance to a DIFFERENT suggestion & expand again
                    suggestionIndex = (suggestionIndex + 1) % suggestions.length;
                    emit("expanding", "");
                    wait(timings.expandMs, runTypewriter);
                  });
                });
              });
            });
          });
        });
      }
    };

    wait(timings.typeFirstCharDelayMs, nextChar);
  };

  const startCycleFromCompact = () => {
    emit("compact-initial", "");
    wait(timings.compactInitialMs, () => {
      emit("expanding", "");
      wait(timings.expandMs, runTypewriter);
    });
  };

  const sync = () => {
    if (!started) return;
    if (engagement.reducedMotion) {
      clearPending();
      emit("reduced-motion", "");
      return;
    }
    if (!canRunIdleAnimation(engagement)) {
      clearPending();
      emit("active", "");
      return;
    }
    // Transitioning from paused/initial into idle: begin compact -> expand cycle
    if (snapshot.phase === "active" || snapshot.phase === "reduced-motion") {
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
      suggestionIndex = (suggestionIndex + 1) % suggestions.length;
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
