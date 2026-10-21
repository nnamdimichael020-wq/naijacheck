/**
 * Light navigation feedback — the policy and the tiny store behind it.
 *
 *   1. A thin brand-green bar at the very top of the viewport, ONLY while a client (App Router)
 *      navigation is still pending after `barDelayMs`. Prefetched/fast navigations show nothing.
 *   2. A small pulse on the header logo, ONLY once a navigation or a *marked* action has been pending
 *      for `pulseDelayMs` (~300 ms). It stops the moment the new route commits / the action settles.
 *   3. No full-screen or branded loader, ever, for page transitions. Nothing here can delay, hide or
 *      block content: the store only observes navigations, it never intercepts or holds them, and the
 *      bar is a 3px, pointer-events: none, aria-hidden strip.
 *   4. Motion is CSS-only and lives under `prefers-reduced-motion: no-preference` (app/globals.css);
 *      with `reduce` the bar is a static strip and the logo never pulses.
 *
 * Wiring: `instrumentation-client.ts` calls `navFeedback.startNavigation()` from Next's
 * `onRouterTransitionStart`; `components/navigation-feedback.tsx` calls `commitPathname()` when
 * `usePathname()` changes (that is when the new route has rendered) and renders the bar.
 * See docs/runbooks/navigation-feedback.md.
 *
 * This module is framework-free and has no DOM access at import time, so it is unit-tested in Node
 * with an injected clock (lib/nav-feedback.test.ts).
 */

export type NavigationType = "push" | "replace" | "traverse";
/** idle = hidden · loading = visible (growing) · done = finishing (fades out, content already shown). */
export type BarPhase = "idle" | "loading" | "done";

export type NavFeedbackConfig = {
  /** Optional thin top bar on client navigations. `false` switches it off site-wide. */
  progressBar: boolean;
  /** Optional header-logo pulse for slow navigations / marked actions. `false` switches it off. */
  logoPulse: boolean;
  /** A navigation must still be pending this long before the bar appears. */
  barDelayMs: number;
  /** A navigation or marked action must still be pending this long before the logo pulses. */
  pulseDelayMs: number;
  /** Length of the bar's finishing fade AFTER content is shown. Never holds content back. */
  finishMs: number;
  /** Defensive cap: clear the indicators if a navigation/action never reports completion. */
  safetyTimeoutMs: number;
};

export const NAV_FEEDBACK_CONFIG: Readonly<NavFeedbackConfig> = Object.freeze({
  progressBar: true,
  logoPulse: true,
  barDelayMs: 150,
  pulseDelayMs: 300,
  finishMs: 320,
  safetyTimeoutMs: 20_000,
});

/** Delay before a pending button shows its inline spinner (fast actions never flash one). */
export const INLINE_SPINNER_DELAY_MS = 150;

export type NavFeedbackSnapshot = Readonly<{
  bar: BarPhase;
  /** true → the header logo pulses (html[data-nav-slow]). */
  slow: boolean;
  /** A tracked navigation is pending (the new route has not committed yet). */
  navigating: boolean;
  /** Marked actions in flight. */
  actions: number;
}>;

export const IDLE_SNAPSHOT: NavFeedbackSnapshot = Object.freeze({ bar: "idle", slow: false, navigating: false, actions: 0 });

export type Scheduler = {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
};

export type NavFeedbackStore = {
  /** Called from `onRouterTransitionStart` (push, replace and back/forward). Returns whether it is tracked. */
  startNavigation(target: string): boolean;
  /** Called with `usePathname()` after each commit. A changed pathname finishes the navigation. */
  commitPathname(pathname: string): void;
  /** Marks an action as pending (logo pulse after `pulseDelayMs`). Returns an idempotent `end()`. */
  beginAction(): () => void;
  /** `beginAction()` around a promise or async function; always ends, even on rejection. */
  trackAction<T>(work: Promise<T> | (() => Promise<T>)): Promise<T>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): NavFeedbackSnapshot;
  getServerSnapshot(): NavFeedbackSnapshot;
  readonly config: Readonly<NavFeedbackConfig>;
};

/** Pathname comparison key: decoded, without a trailing slash (except the root). */
export function normalizePathname(pathname: string): string {
  let value = pathname || "/";
  try {
    value = decodeURI(value);
  } catch {
    // Keep the raw value; malformed escapes still compare consistently.
  }
  if (value.length > 1) value = value.replace(/\/+$/, "");
  return value || "/";
}

/**
 * Does a router transition to `target` deserve feedback? Only when it changes the PATHNAME relative
 * to the last committed one and stays on this origin. Same-page links, hash jumps and query-only
 * changes never show the bar: completion is detected by a pathname change, so tracking them could
 * leave an indicator waiting for a change that never comes.
 */
export function shouldTrackNavigation(target: string, committedPathname: string, baseHref: string): boolean {
  let url: URL;
  let base: URL;
  try {
    base = new URL(baseHref);
    url = new URL(target, base);
  } catch {
    return false;
  }
  if (url.origin !== base.origin) return false;
  return normalizePathname(url.pathname) !== normalizePathname(committedPathname);
}

const browserScheduler: Scheduler = {
  now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function createNavFeedbackStore(
  options: {
    config?: Partial<NavFeedbackConfig>;
    scheduler?: Scheduler;
    initialPathname?: string;
    baseHref?: () => string;
  } = {},
): NavFeedbackStore {
  const config: Readonly<NavFeedbackConfig> = Object.freeze({ ...NAV_FEEDBACK_CONFIG, ...options.config });
  const clock = options.scheduler ?? browserScheduler;
  const baseHref = options.baseHref ?? (() => (typeof location !== "undefined" ? location.href : "http://localhost/"));
  let committed = normalizePathname(options.initialPathname ?? (typeof location !== "undefined" ? location.pathname : "/"));

  let snapshot: NavFeedbackSnapshot = IDLE_SNAPSHOT;
  const listeners = new Set<() => void>();

  /** Start of the pending navigation chain (kept when a second link is tapped mid-flight). */
  let navStartedAt: number | null = null;
  const actionStarts = new Map<number, number>();
  const actionSafety = new Map<number, unknown>();
  let nextActionId = 1;
  let barTimer: unknown = null;
  let pulseTimer: unknown = null;
  let finishTimer: unknown = null;
  let safetyTimer: unknown = null;

  const cancel = (handle: unknown): null => {
    if (handle !== null) clock.clearTimeout(handle);
    return null;
  };

  function emit(next: Partial<NavFeedbackSnapshot>): void {
    const merged = { ...snapshot, ...next };
    if (
      merged.bar === snapshot.bar &&
      merged.slow === snapshot.slow &&
      merged.navigating === snapshot.navigating &&
      merged.actions === snapshot.actions
    ) {
      return;
    }
    snapshot = Object.freeze(merged);
    for (const listener of [...listeners]) listener();
  }

  function earliestPendingStart(): number | null {
    let earliest = navStartedAt;
    for (const startedAt of actionStarts.values()) {
      if (earliest === null || startedAt < earliest) earliest = startedAt;
    }
    return earliest;
  }

  /** slow = something has been pending for at least pulseDelayMs. Re-arms itself until then. */
  function refreshPulse(): void {
    pulseTimer = cancel(pulseTimer);
    const startedAt = earliestPendingStart();
    if (!config.logoPulse || startedAt === null) {
      emit({ slow: false });
      return;
    }
    const remaining = startedAt + config.pulseDelayMs - clock.now();
    if (remaining <= 0) {
      emit({ slow: true });
      return;
    }
    emit({ slow: false });
    pulseTimer = clock.setTimeout(refreshPulse, remaining);
  }

  function finishNavigation(): void {
    if (navStartedAt === null) return;
    navStartedAt = null;
    barTimer = cancel(barTimer);
    safetyTimer = cancel(safetyTimer);
    if (snapshot.bar === "loading") {
      // Content is already on screen; the bar only plays its short finishing fade.
      emit({ bar: "done", navigating: false });
      finishTimer = cancel(finishTimer);
      finishTimer = clock.setTimeout(() => {
        finishTimer = null;
        emit({ bar: "idle" });
      }, config.finishMs);
    } else {
      // The bar never appeared (a fast navigation): there is nothing to finish or flash.
      emit({ navigating: false });
    }
    refreshPulse();
  }

  function startNavigation(target: string): boolean {
    if (!shouldTrackNavigation(target, committed, baseHref())) {
      // A same-page/hash transition supersedes a pending navigation (Next discards it), so the
      // pathname will not change: finish now instead of waiting for the safety cap.
      finishNavigation();
      return false;
    }
    if (navStartedAt === null) {
      navStartedAt = clock.now();
      if (config.progressBar) {
        if (snapshot.bar === "done") {
          // Still fading from the previous navigation: keep it visible rather than flicker.
          finishTimer = cancel(finishTimer);
          emit({ bar: "loading" });
        } else {
          barTimer = cancel(barTimer);
          barTimer = clock.setTimeout(() => {
            barTimer = null;
            if (navStartedAt !== null) emit({ bar: "loading" });
          }, config.barDelayMs);
        }
      }
    }
    safetyTimer = cancel(safetyTimer);
    safetyTimer = clock.setTimeout(() => {
      safetyTimer = null;
      finishNavigation();
    }, config.safetyTimeoutMs);
    emit({ navigating: true });
    refreshPulse();
    return true;
  }

  function commitPathname(pathname: string): void {
    const next = normalizePathname(pathname);
    const changed = next !== committed;
    committed = next;
    if (changed) finishNavigation();
  }

  function beginAction(): () => void {
    const id = nextActionId++;
    actionStarts.set(id, clock.now());
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      actionStarts.delete(id);
      cancel(actionSafety.get(id) ?? null);
      actionSafety.delete(id);
      emit({ actions: actionStarts.size });
      refreshPulse();
    };
    actionSafety.set(id, clock.setTimeout(end, config.safetyTimeoutMs));
    emit({ actions: actionStarts.size });
    refreshPulse();
    return end;
  }

  async function trackAction<T>(work: Promise<T> | (() => Promise<T>)): Promise<T> {
    const end = beginAction();
    try {
      return await (typeof work === "function" ? work() : work);
    } finally {
      end();
    }
  }

  return {
    startNavigation,
    commitPathname,
    beginAction,
    trackAction,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => IDLE_SNAPSHOT,
    config,
  };
}

/**
 * The page-wide store. In the browser it lives on `window` so the instrumentation hook (main bundle)
 * and the layout component always share one instance; on the server it is inert (idle snapshot only).
 */
const GLOBAL_KEY = "__naijacheckNavFeedback";
export const navFeedback: NavFeedbackStore = (() => {
  if (typeof window === "undefined") return createNavFeedbackStore({ initialPathname: "/" });
  const scope = window as unknown as Record<string, NavFeedbackStore | undefined>;
  return (scope[GLOBAL_KEY] ??= createNavFeedbackStore());
})();
