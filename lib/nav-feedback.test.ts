/**
 * Light navigation feedback tests — policy, timing and markup.
 *
 *   - Fast navigations (< 150 ms) show NOTHING; the bar appears only past 150 ms and the logo pulse
 *     only past 300 ms; both clear in the same tick the new route commits (no minimum display time).
 *   - Same-page / hash / query-only transitions are never tracked; a pending navigation superseded
 *     by one finishes immediately; a navigation that never reports completion is capped.
 *   - Marked actions can pulse the logo but never show the top bar (tools/quiz use button spinners).
 *   - The SSR markup is a decorative 3px strip (aria-hidden, idle) and the CSS is static by default
 *     with motion only under prefers-reduced-motion: no-preference; there is no route loading screen.
 *
 * Run with: npm run navfeedback:test
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NavigationFeedback } from "../components/navigation-feedback";
import { InlineSpinner } from "../components/ui/inline-spinner";
import {
  IDLE_SNAPSHOT,
  INLINE_SPINNER_DELAY_MS,
  NAV_FEEDBACK_CONFIG,
  createNavFeedbackStore,
  navFeedback,
  normalizePathname,
  shouldTrackNavigation,
  type NavFeedbackConfig,
  type NavFeedbackSnapshot,
  type Scheduler,
} from "./nav-feedback";

const ORIGIN = "https://naijacheck.ng";

/* ---------- deterministic clock ---------- */
function fakeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const scheduler: Scheduler = {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { at: now + Math.max(0, ms), fn });
      return id;
    },
    clearTimeout: (handle) => {
      timers.delete(handle as number);
    },
  };
  return {
    scheduler,
    get now() {
      return now;
    },
    /** Runs every timer due up to `now + ms`, in order, then parks the clock there. */
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        let next: [number, { at: number; fn: () => void }] | null = null;
        for (const entry of timers) {
          if (entry[1].at > target) continue;
          if (!next || entry[1].at < next[1].at || (entry[1].at === next[1].at && entry[0] < next[0])) next = entry;
        }
        if (!next) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].fn();
      }
      now = target;
    },
    pendingTimers: () => timers.size,
  };
}

type Frame = { t: number } & NavFeedbackSnapshot;

/** A store on a fake clock that records every emitted snapshot with its timestamp. */
function harness(config: Partial<NavFeedbackConfig> = {}, initialPathname = "/") {
  const clock = fakeClock();
  let current = initialPathname;
  const store = createNavFeedbackStore({
    config,
    scheduler: clock.scheduler,
    initialPathname,
    baseHref: () => `${ORIGIN}${current}`,
  });
  const frames: Frame[] = [];
  store.subscribe(() => frames.push({ t: clock.now, ...store.getSnapshot() }));
  return {
    store,
    clock,
    frames,
    /** Simulates usePathname() changing after the new route commits. */
    commit(pathname: string) {
      current = pathname;
      store.commitPathname(pathname);
    },
    firstTime(predicate: (frame: Frame) => boolean): number | null {
      return frames.find(predicate)?.t ?? null;
    },
  };
}

/* ---------- tiny runner (sync + async) ---------- */
const cases: Array<[string, () => void | Promise<void>]> = [];
const test = (name: string, fn: () => void | Promise<void>) => cases.push([name, fn]);

/* ======================= policy ======================= */
test("policy: thresholds keep fast loads silent and never hold content", () => {
  const c = NAV_FEEDBACK_CONFIG;
  assert.equal(c.progressBar, true, "thin top bar is on by default (switchable)");
  assert.equal(c.logoPulse, true, "logo pulse is on by default (switchable)");
  assert.ok(c.barDelayMs >= 100 && c.barDelayMs < c.pulseDelayMs, "bar waits past the ~100 ms 'instant' window, before the pulse");
  assert.ok(c.pulseDelayMs >= 250 && c.pulseDelayMs <= 350, "logo pulse only past ~300 ms");
  assert.ok(c.finishMs <= 400, "the finishing fade is short and runs after content is shown");
  assert.ok(c.safetyTimeoutMs >= 10_000, "safety cap is generous enough for slow 3G/2G navigations");
  assert.ok(INLINE_SPINNER_DELAY_MS <= c.barDelayMs, "button spinners use the same no-flash delay");
  assert.ok(Object.isFrozen(c), "config is frozen");
});

test("normalizePathname: trailing slashes and escapes compare equal", () => {
  assert.equal(normalizePathname("/"), "/");
  assert.equal(normalizePathname(""), "/");
  assert.equal(normalizePathname("/prices/"), "/prices");
  assert.equal(normalizePathname("/prices//"), "/prices");
  assert.equal(normalizePathname("/caf%C3%A9"), "/café");
  assert.equal(normalizePathname("/bad%E0%A4%A"), "/bad%E0%A4%A", "malformed escapes stay comparable");
});

test("shouldTrackNavigation: only same-origin pathname changes", () => {
  const at = (p: string) => `${ORIGIN}${p}`;
  assert.equal(shouldTrackNavigation("/charts/parallel-usd-buy", "/", at("/")), true);
  assert.equal(shouldTrackNavigation(`${ORIGIN}/prices`, "/status", at("/prices")), true, "back/forward passes the full URL");
  assert.equal(shouldTrackNavigation("fuel", "/prices/lagos", at("/prices/lagos")), true, "relative hrefs resolve");
  assert.equal(shouldTrackNavigation("/", "/", at("/")), false, "same page");
  assert.equal(shouldTrackNavigation("#main", "/status", at("/status")), false, "hash jump");
  assert.equal(shouldTrackNavigation("/status#push", "/status", at("/status")), false, "same page + hash");
  assert.equal(shouldTrackNavigation("/status?tab=fx", "/status", at("/status")), false, "query-only change");
  assert.equal(shouldTrackNavigation("/prices/", "/prices", at("/prices")), false, "trailing slash");
  assert.equal(shouldTrackNavigation("https://example.com/", "/", at("/")), false, "external origin");
  assert.equal(shouldTrackNavigation("http://[", "/", at("/")), false, "unparseable href");
});

/* ======================= navigation timelines ======================= */
test("fast navigation (80 ms, e.g. prefetched): no bar, no pulse, no timers left", () => {
  const h = harness();
  assert.equal(h.store.startNavigation("/status"), true);
  h.clock.advance(80);
  h.commit("/status");
  h.clock.advance(2_000);
  assert.equal(h.firstTime((f) => f.bar !== "idle"), null, "bar never shown");
  assert.equal(h.firstTime((f) => f.slow), null, "logo never pulses");
  assert.deepEqual(h.store.getSnapshot(), IDLE_SNAPSHOT);
  assert.equal(h.clock.pendingTimers(), 0, "nothing keeps ticking after a fast navigation");
});

test("medium navigation (220 ms): bar from 150 ms, finishes at commit, no pulse", () => {
  const h = harness();
  h.store.startNavigation("/prices");
  h.clock.advance(220);
  h.commit("/prices");
  h.clock.advance(1_000);
  assert.equal(h.firstTime((f) => f.bar === "loading"), 150);
  assert.equal(h.firstTime((f) => f.bar === "done"), 220, "finishes in the same tick the route commits");
  assert.equal(h.firstTime((f) => f.bar === "idle" && f.t > 150), 220 + NAV_FEEDBACK_CONFIG.finishMs);
  assert.equal(h.firstTime((f) => f.slow), null, "no pulse under 300 ms");
});

test("slow navigation (1.5 s, e.g. 3G without prefetch): bar 150 ms, pulse 300 ms, both clear at commit", () => {
  const h = harness();
  h.store.startNavigation("/charts/parallel-usd-buy");
  h.clock.advance(1_500);
  assert.equal(h.store.getSnapshot().bar, "loading");
  assert.equal(h.store.getSnapshot().slow, true);
  h.commit("/charts/parallel-usd-buy");
  const atCommit = h.store.getSnapshot();
  assert.equal(atCommit.slow, false, "pulse stops the moment content is ready");
  assert.equal(atCommit.bar, "done", "bar only plays its finishing fade");
  assert.equal(atCommit.navigating, false);
  h.clock.advance(1_000);
  assert.equal(h.firstTime((f) => f.bar === "loading"), 150);
  assert.equal(h.firstTime((f) => f.slow), 300);
  assert.equal(h.firstTime((f) => !f.slow && f.t > 300), 1_500);
  assert.equal(h.store.getSnapshot().bar, "idle");
});

test("no minimum display time: committing 1 ms after the bar appears finishes immediately", () => {
  const h = harness();
  h.store.startNavigation("/hustle");
  h.clock.advance(151);
  h.commit("/hustle");
  assert.equal(h.store.getSnapshot().bar, "done");
  assert.equal(h.store.getSnapshot().navigating, false);
});

test("a second tap mid-flight keeps the original start (pulse still at 300 ms)", () => {
  const h = harness();
  h.store.startNavigation("/prices");
  h.clock.advance(200);
  assert.equal(h.store.startNavigation("/status"), true);
  h.clock.advance(200);
  assert.equal(h.firstTime((f) => f.slow), 300, "measured from the first tap");
  h.commit("/status");
  assert.equal(h.store.getSnapshot().slow, false);
  assert.equal(h.store.getSnapshot().bar, "done");
});

test("a pending navigation superseded by a same-page/hash transition finishes now", () => {
  const h = harness({}, "/status");
  h.store.startNavigation("/prices");
  h.clock.advance(200);
  assert.equal(h.store.startNavigation("#push-settings-title"), false);
  const s = h.store.getSnapshot();
  assert.equal(s.navigating, false);
  assert.equal(s.bar, "done");
  assert.equal(s.slow, false);
});

test("hash jumps and same-page links never show anything", () => {
  const h = harness({}, "/status");
  assert.equal(h.store.startNavigation("#main"), false);
  assert.equal(h.store.startNavigation("/status"), false);
  h.clock.advance(5_000);
  assert.equal(h.frames.length, 0, "no snapshot was emitted");
  assert.equal(h.clock.pendingTimers(), 0);
});

test("back/forward (traverse, full URL) restored from cache in 40 ms shows nothing", () => {
  const h = harness({}, "/prices");
  assert.equal(h.store.startNavigation(`${ORIGIN}/status`), true);
  h.clock.advance(40);
  h.commit("/status");
  h.clock.advance(1_000);
  assert.equal(h.firstTime((f) => f.bar !== "idle" || f.slow), null);
});

test("a re-render with the same pathname does not finish a pending navigation", () => {
  const h = harness();
  h.store.startNavigation("/prices");
  h.clock.advance(100);
  h.commit("/");
  assert.equal(h.store.getSnapshot().navigating, true);
  h.clock.advance(100);
  assert.equal(h.store.getSnapshot().bar, "loading");
});

test("safety cap: a navigation that never reports completion is cleared, never stuck", () => {
  const h = harness();
  h.store.startNavigation("/prices");
  h.clock.advance(NAV_FEEDBACK_CONFIG.safetyTimeoutMs - 1);
  assert.equal(h.store.getSnapshot().navigating, true);
  h.clock.advance(1);
  assert.equal(h.store.getSnapshot().navigating, false);
  assert.equal(h.store.getSnapshot().slow, false);
  h.clock.advance(NAV_FEEDBACK_CONFIG.finishMs);
  assert.deepEqual(h.store.getSnapshot(), IDLE_SNAPSHOT);
  assert.equal(h.clock.pendingTimers(), 0);
});

test("a new navigation during the finishing fade re-shows the bar without flicker", () => {
  const h = harness();
  h.store.startNavigation("/prices");
  h.clock.advance(400);
  h.commit("/prices");
  h.clock.advance(100);
  assert.equal(h.store.getSnapshot().bar, "done");
  h.store.startNavigation("/status");
  assert.equal(h.store.getSnapshot().bar, "loading", "still visible, straight back to loading");
  h.clock.advance(NAV_FEEDBACK_CONFIG.finishMs);
  assert.equal(h.store.getSnapshot().bar, "loading", "the old fade timer was cancelled");
});

/* ======================= marked actions ======================= */
test("marked action: never shows the top bar; pulses only past 300 ms; end is idempotent", () => {
  const h = harness();
  const end = h.store.beginAction();
  assert.equal(h.store.getSnapshot().actions, 1);
  h.clock.advance(299);
  assert.equal(h.store.getSnapshot().slow, false);
  h.clock.advance(1);
  assert.equal(h.store.getSnapshot().slow, true);
  h.clock.advance(500);
  end();
  assert.equal(h.store.getSnapshot().slow, false, "pulse stops as soon as the action settles");
  const emitted = h.frames.length;
  end();
  assert.equal(h.frames.length, emitted, "second end() is a no-op");
  assert.equal(h.firstTime((f) => f.bar !== "idle"), null, "actions never drive the top bar");
  assert.equal(h.clock.pendingTimers(), 0);
});

test("fast marked action (200 ms) never pulses", () => {
  const h = harness();
  const end = h.store.beginAction();
  h.clock.advance(200);
  end();
  h.clock.advance(1_000);
  assert.equal(h.firstTime((f) => f.slow), null);
});

test("concurrent actions: the pulse follows whichever has been pending ≥ 300 ms", () => {
  const h = harness();
  const endA = h.store.beginAction();
  h.clock.advance(250);
  const endB = h.store.beginAction();
  h.clock.advance(150); // t = 400: A slow since 300
  assert.equal(h.store.getSnapshot().slow, true);
  endA(); // B pending only 150 ms
  assert.equal(h.store.getSnapshot().slow, false, "B has not exceeded 300 ms yet");
  h.clock.advance(150); // t = 550 → B at 300 ms
  assert.equal(h.store.getSnapshot().slow, true);
  endB();
  assert.equal(h.store.getSnapshot().slow, false);
});

test("trackAction always ends, on success and on failure", async () => {
  const h = harness();
  const value = await h.store.trackAction(async () => 42);
  assert.equal(value, 42);
  assert.equal(h.store.getSnapshot().actions, 0);
  await assert.rejects(h.store.trackAction(Promise.reject(new Error("offline"))), /offline/);
  assert.equal(h.store.getSnapshot().actions, 0);
  assert.equal(h.store.getSnapshot().slow, false);
});

test("an action that never ends is capped by the safety timeout", () => {
  const h = harness();
  h.store.beginAction();
  h.clock.advance(NAV_FEEDBACK_CONFIG.safetyTimeoutMs);
  assert.equal(h.store.getSnapshot().actions, 0);
  assert.equal(h.store.getSnapshot().slow, false);
});

/* ======================= switches and store contract ======================= */
test("progressBar: false → no bar even on a slow navigation (pulse still allowed)", () => {
  const h = harness({ progressBar: false });
  h.store.startNavigation("/prices");
  h.clock.advance(2_000);
  assert.equal(h.store.getSnapshot().bar, "idle");
  assert.equal(h.store.getSnapshot().slow, true);
  h.commit("/prices");
  assert.deepEqual(h.store.getSnapshot(), IDLE_SNAPSHOT);
});

test("logoPulse: false → the logo never pulses (bar still allowed)", () => {
  const h = harness({ logoPulse: false });
  h.store.startNavigation("/prices");
  h.store.beginAction();
  h.clock.advance(2_000);
  assert.equal(h.store.getSnapshot().slow, false);
  assert.equal(h.store.getSnapshot().bar, "loading");
});

test("store contract: stable snapshots, no-op emits suppressed, unsubscribe works, server idle", () => {
  const h = harness();
  const a = h.store.getSnapshot();
  h.commit("/");
  assert.equal(h.store.getSnapshot(), a, "same reference when nothing changed");
  let calls = 0;
  const off = h.store.subscribe(() => calls++);
  h.store.startNavigation("/prices");
  assert.ok(calls > 0);
  off();
  const before = calls;
  h.clock.advance(1_000);
  assert.equal(calls, before, "no calls after unsubscribe");
  assert.equal(h.store.getServerSnapshot(), IDLE_SNAPSHOT);
  assert.equal(typeof h.store.startNavigation("/status"), "boolean", "observes only — never returns a promise to await");
  assert.deepEqual(navFeedback.getSnapshot(), IDLE_SNAPSHOT, "the server-side singleton is inert");
});

/* ======================= markup ======================= */
test("SSR markup: a decorative, idle, aria-hidden 3px strip — no text, role or focus stop", () => {
  const html = renderToStaticMarkup(createElement(NavigationFeedback));
  assert.equal(
    html,
    '<div class="nav-progress" data-nav-progress="idle" aria-hidden="true"><div class="nav-progress-bar"></div></div>',
  );
  assert.doesNotMatch(html, /role=|tabindex|aria-live/);
});

test("InlineSpinner markup: decorative span only", () => {
  const html = renderToStaticMarkup(createElement(InlineSpinner));
  assert.equal(html, '<span aria-hidden="true" data-inline-spinner="" class="inline-spinner"></span>');
});

/* ======================= CSS + route policy ======================= */
const repo = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(repo, "app", "globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Top-level `@media (...) { ... }` blocks whose header matches `featureRe`. */
function mediaBlocks(source: string, featureRe: RegExp): string[] {
  const blocks: string[] = [];
  const re = /@media[^{]*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
      i += 1;
    }
    if (featureRe.test(m[0])) blocks.push(source.slice(m.index, i));
  }
  return blocks;
}
/** Innermost `selector { body }` rules. */
const rules = (source: string) =>
  [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
const NAV_CLASS = /\.(nav-progress|nav-progress-bar|nav-logo-mark|inline-spinner)\b/;

const noPref = mediaBlocks(css, /prefers-reduced-motion\s*:\s*no-preference/i);
const reduce = mediaBlocks(css, /prefers-reduced-motion\s*:\s*reduce/i);
const outside = [...noPref, ...reduce].reduce((acc, block) => acc.split(block).join(""), css);

test("CSS: the strip is fixed to the top, ≤ 4px, above the header and ignores the pointer", () => {
  const bar = rules(outside).find((r) => r.selector === ".nav-progress");
  assert.ok(bar, ".nav-progress rule exists");
  assert.match(bar.body, /position:\s*fixed/);
  assert.match(bar.body, /top:\s*0/);
  assert.match(bar.body, /pointer-events:\s*none/);
  const height = Number(bar.body.match(/height:\s*(\d+(?:\.\d+)?)px/)?.[1]);
  assert.ok(height > 0 && height <= 4, `thin strip, got ${height}px`);
  assert.ok(Number(bar.body.match(/z-index:\s*(\d+)/)?.[1]) > 40, "above the sticky header (z-40)");
  assert.match(rules(outside).find((r) => r.selector === ".nav-progress-bar")?.body ?? "", /background-color:\s*hsl\(var\(--primary\)\)/, "brand green");
});

test("CSS: static by default — nav/spinner motion only under no-preference", () => {
  for (const rule of rules(outside)) {
    if (!NAV_CLASS.test(rule.selector)) continue;
    assert.doesNotMatch(rule.body, /animation(-name)?\s*:(?!\s*none\b)/, `${rule.selector} animates outside no-preference`);
    assert.doesNotMatch(rule.body, /transition(-property)?\s*:(?!\s*none\b)/, `${rule.selector} transitions outside no-preference`);
  }
  const motion = rules(noPref.join("\n"));
  assert.ok(motion.some((r) => /data-nav-progress="loading"\]\s*\.nav-progress-bar/.test(r.selector) && /animation:\s*nav-progress-grow/.test(r.body)));
  assert.ok(motion.some((r) => r.selector === ".inline-spinner" && /animation:\s*inline-spin/.test(r.body)));
});

test("CSS: the logo pulses only while html[data-nav-slow] (never on every load)", () => {
  const animated = rules(css).filter((r) => /\.nav-logo-mark/.test(r.selector) && /animation\s*:(?!\s*none\b)/.test(r.body));
  assert.equal(animated.length, 1, "exactly one rule animates the logo");
  assert.equal(animated[0].selector, "html[data-nav-slow] .nav-logo-mark");
  assert.ok(noPref.some((b) => b.includes("html[data-nav-slow] .nav-logo-mark")), "and it lives under no-preference");
});

test("CSS: prefers-reduced-motion: reduce kills animation, transition and transform", () => {
  const killer = rules(reduce.join("\n")).find((r) =>
    [".nav-progress", ".nav-progress-bar", ".nav-logo-mark", ".inline-spinner"].every((cls) => r.selector.split(/\s*,\s*/).includes(cls)),
  );
  assert.ok(killer, "one reduce rule covers the strip, its bar, the logo and the spinner");
  assert.match(killer.body, /animation:\s*none\s*!important/);
  assert.match(killer.body, /transition:\s*none\s*!important/);
  assert.match(killer.body, /transform:\s*none\s*!important/);
});

test("CSS: no bounce and no full-screen layer", () => {
  for (const name of ["nav-progress-grow", "nav-logo-pulse", "inline-spin"]) {
    const kf = css.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?\\}\\s*)\\}`))?.[1] ?? "";
    assert.ok(kf, `@keyframes ${name} exists`);
    assert.doesNotMatch(kf, /translate|bounce/i, `${name} must not bounce`);
  }
  const pulseScales = [...(css.match(/@keyframes\s+nav-logo-pulse[\s\S]*?\}\s*\}/)?.[0] ?? "").matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
  assert.ok(pulseScales.length && Math.min(...pulseScales) >= 0.85, "the logo pulse is small (scale ≥ 0.85)");
  for (const rule of rules(css)) {
    if (!NAV_CLASS.test(rule.selector)) continue;
    assert.doesNotMatch(rule.body, /inset:\s*0(?!\s+0\s+auto)|100d?vh|bottom:\s*0/, `${rule.selector} must not cover the viewport`);
  }
});

test("routes: no loading.tsx screens — transitions never swap content for a loader", () => {
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const loading = walk(path.join(repo, "app")).filter((f) => /(^|[\\/])loading\.(t|j)sx?$/.test(f));
  assert.deepEqual(loading, []);
});

async function main() {
  let passed = 0;
  for (const [name, fn] of cases) {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  }
  console.log(`${passed} navigation feedback tests passed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
