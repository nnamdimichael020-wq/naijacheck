#!/usr/bin/env node
/**
 * Real-browser check for the light navigation feedback (lib/nav-feedback.ts).
 *
 * Serves the static export in out/, emulates a 390×844 touch phone and, per scenario, records (via a
 * MutationObserver installed before hydration) when the top strip appears, when the header logo starts
 * pulsing, when the new route's <h1> lands in the DOM, and when both indicators clear:
 *
 *   A. fast network, link already prefetched → no strip, no pulse;
 *   B. fast network, link NOT prefetched (footer) → still nothing (local fetch is quick);
 *   C. "Fast 3G" (562.5 ms RTT, 1.44 Mbps) and D. "Slow 3G" (2 s RTT, 400 kbps), link not prefetched
 *      → strip at ≈150 ms, pulse at ≈300 ms, both cleared in the frame the new route commits; the old
 *      page stays visible and tappable meanwhile (no overlay: elementFromPoint stays on content);
 *   E. prefers-reduced-motion: reduce on Slow 3G → static full-width strip, logo never animates;
 *   F. hash-only and same-page router transitions, skip link, back/forward → nothing stuck;
 *   G. button-only spinners: hustle demo payment and push "Enable alerts" (mocked /api/push/*)
 *      → aria-busy + spinner after 150 ms on the button, the page strip and logo stay idle.
 *   H. search: Enter on a result is a client navigation (same document, no full reload).
 *
 * Desktop Chromium emulation, not a physical phone — see docs/runbooks/navigation-feedback.md.
 *
 * Usage:
 *   npm run build
 *   npm i --no-save puppeteer-core@23            # or set PUPPETEER_MODULE_DIR to an existing install
 *   CHROME_PATH=/path/to/chrome node scripts/qa/nav-feedback-check.mjs [--out /tmp/nav-feedback-qa]
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve("out");
const outArg = process.argv.indexOf("--out");
const shotsDir = path.resolve(outArg > -1 ? process.argv[outArg + 1] : "/tmp/nav-feedback-qa");
const chromePath = process.env.CHROME_PATH;
if (!fs.existsSync(root)) throw new Error("out/ is missing; run npm run build first");
if (!chromePath) throw new Error("Set CHROME_PATH to a local Chrome/Chromium binary");
fs.mkdirSync(shotsDir, { recursive: true });

const require = createRequire(import.meta.url);
function loadPuppeteer() {
  const paths = [process.env.PUPPETEER_MODULE_DIR, process.cwd()].filter(Boolean);
  try {
    return require(require.resolve("puppeteer-core", { paths }));
  } catch {
    throw new Error("puppeteer-core not found: run `npm i --no-save puppeteer-core@23` or set PUPPETEER_MODULE_DIR");
  }
}
const puppeteer = loadPuppeteer();

/* DevTools presets (Chrome 131): throughput in bytes/s, latency = request RTT in ms. */
const NETWORKS = {
  "Fast 3G": puppeteer.PredefinedNetworkConditions?.["Fast 3G"] ?? { download: 180_000, upload: 84_375, latency: 562.5 },
  "Slow 3G": puppeteer.PredefinedNetworkConditions?.["Slow 3G"] ?? { download: 50_000, upload: 50_000, latency: 2_000 },
};

/* ---------- mocked push API (a real P-256 public key, so the browser accepts it) ---------- */
const { publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = publicKey.export({ format: "jwk" });
const VAPID_PUBLIC = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]).toString("base64url");

/* ---------- tiny static server for out/ (trailingSlash: false) ---------- */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (pathname === "/api/push/config") {
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify({ available: true, publicKey: VAPID_PUBLIC }));
    return;
  }
  if (pathname === "/api/push/subscribe" || pathname === "/api/push/unsubscribe") {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');
    });
    return;
  }
  const candidates = [pathname, `${pathname}.html`, path.join(pathname, "index.html")];
  for (const candidate of candidates) {
    const file = path.join(root, candidate);
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
      return;
    }
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const results = [];
const timelines = {};
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "FAIL"} - ${name}${detail ? ` (${detail})` : ""}`);
};
const info = (name, detail) => {
  results.push({ name, ok: true, info: true, detail });
  console.log(`info - ${name} (${detail})`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const within = (value, lo, hi) => typeof value === "number" && value >= lo && value <= hi;

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
});

/* ---------- recorder: installed before any page script, survives client navigations ---------- */
function recorder() {
  const qa = (window.__navQA = { t0: 0, events: [], lastH1: null });
  const h1Text = () => document.querySelector("main h1")?.textContent?.trim() ?? null;
  const centerHit = () => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    if (!el) return null;
    return { tag: el.tagName.toLowerCase(), inMain: Boolean(el.closest("main")), onStrip: Boolean(el.closest(".nav-progress")) };
  };
  const onMutations = (records) => {
    const t = performance.now();
    for (const r of records) {
      if (r.type !== "attributes") continue;
      if (r.attributeName === "data-nav-progress") {
        const strip = r.target;
        const bar = strip.querySelector(".nav-progress-bar");
        const cs = getComputedStyle(strip);
        const bs = bar ? getComputedStyle(bar) : null;
        const rect = strip.getBoundingClientRect();
        qa.events.push({
          type: "bar",
          t,
          state: strip.getAttribute("data-nav-progress"),
          opacity: cs.opacity,
          transitionDuration: cs.transitionDuration,
          pointerEvents: cs.pointerEvents,
          zIndex: cs.zIndex,
          position: cs.position,
          rect: { top: rect.top, height: rect.height, width: rect.width },
          barAnimation: bs?.animationName ?? null,
          barTransform: bs?.transform ?? null,
          barColor: bs?.backgroundColor ?? null,
          h1: h1Text(),
          center: centerHit(),
        });
      } else if (r.attributeName === "data-nav-slow" && r.target === document.documentElement) {
        const logo = document.querySelector(".nav-logo-mark");
        qa.events.push({
          type: "slow",
          t,
          on: document.documentElement.hasAttribute("data-nav-slow"),
          logoAnimation: logo ? getComputedStyle(logo).animationName : null,
          h1: h1Text(),
        });
      }
    }
    const text = h1Text();
    if (text !== qa.lastH1) {
      qa.events.push({ type: "h1", t, text, path: location.pathname });
      qa.lastH1 = text;
    }
  };
  const start = () => {
    qa.lastH1 = h1Text();
    new MutationObserver(onMutations).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-nav-progress", "data-nav-slow"],
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

/**
 * A fresh incognito context per scenario (own storage, caches and service worker). Navigation
 * scenarios bypass the service worker: PwaClient registers it on load, and fetches it proxies run in
 * the worker, outside page-level throttling. It never caches RSC payloads (.txt), so on a real phone
 * those requests hit the slow network either way.
 */
async function openPhone({ reducedMotion = false, bypassServiceWorker = true, theme = null, grantNotifications = false, incognito = true } = {}) {
  // Push is unavailable in incognito contexts (crbug.com/401439), so the push scenario uses the default one.
  const context = incognito ? await browser.createBrowserContext() : browser.defaultBrowserContext();
  const page = await context.newPage();
  await page.setBypassServiceWorker(bypassServiceWorker);
  await page.emulate({
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }]);
  await page.evaluateOnNewDocument(recorder);
  if (theme) await page.evaluateOnNewDocument((t) => localStorage.setItem("theme", t), theme); // next-themes key
  if (grantNotifications) {
    // chrome-headless-shell hard-denies notifications (overridePermissions has no effect there), so
    // grant it in-page; the real component, service worker and pushManager flow still run.
    // The prompt "takes" 600 ms, like a person tapping Allow, so the button's pending state is real.
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(Notification, "permission", { configurable: true, get: () => "granted" });
      Notification.requestPermission = () => new Promise((resolve) => setTimeout(() => resolve("granted"), 600));
    });
  }
  const log = { rsc: [], errors: [] };
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.origin !== base) return void req.abort(); // no third-party noise (ads, analytics)
    if (url.pathname.endsWith(".txt")) {
      log.rsc.push({ path: url.pathname, prefetch: Boolean(req.headers()["next-router-prefetch"]), at: Date.now(), done: false });
    }
    req.continue();
  });
  page.on("requestfinished", (req) => {
    const url = new URL(req.url());
    if (!url.pathname.endsWith(".txt")) return;
    const entry = [...log.rsc].reverse().find((e) => e.path === url.pathname && !e.done);
    if (entry) entry.done = true;
  });
  page.on("pageerror", (error) => log.errors.push(String(error)));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const where = msg.location()?.url ?? "";
    if (/\/api\/|googlesyndication|google-analytics|googletagmanager/.test(where + msg.text())) return;
    if (/net::ERR_FAILED|ERR_BLOCKED/.test(msg.text())) return; // aborted third-party requests
    log.errors.push(msg.text());
  });
  return { page, log, context };
}

async function load(page, route) {
  await page.goto(`${base}${route}`, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.next?.router) && document.querySelector(".nav-progress"));
  await sleep(1_500); // hydration + idle-time prefetch of visible links
}

/** Clicks `selector` from inside the page (precise t0) and waits for the new route's h1. */
async function measureNavigation(page, { selector, run, expectPath, settleMs = 1_000, midFlight }) {
  await page.evaluate(() => {
    window.__navQA.events.length = 0;
    window.__navQA.t0 = 0;
  });
  if (selector) {
    await page.evaluate((sel) => {
      const link = document.querySelector(sel);
      if (!link) throw new Error(`missing ${sel}`);
      window.__navQA.t0 = performance.now();
      link.click();
    }, selector);
  } else {
    await page.evaluate(run);
  }
  if (midFlight) await midFlight();
  await page.waitForFunction((p) => location.pathname === p && window.__navQA.events.some((e) => e.type === "h1"), { timeout: 90_000 }, expectPath);
  await sleep(settleMs);
  const state = await page.evaluate(() => ({
    t0: window.__navQA.t0,
    events: window.__navQA.events,
    finalBar: document.querySelector(".nav-progress")?.getAttribute("data-nav-progress"),
    finalSlow: document.documentElement.hasAttribute("data-nav-slow"),
  }));
  const rel = (e) => (e ? Math.round(e.t - state.t0) : null);
  const ev = state.events;
  const barOn = ev.find((e) => e.type === "bar" && e.state === "loading");
  const barDone = ev.find((e) => e.type === "bar" && e.state === "done");
  const barIdle = [...ev].reverse().find((e) => e.type === "bar" && e.state === "idle");
  const slowOn = ev.find((e) => e.type === "slow" && e.on);
  const slowOff = ev.find((e) => e.type === "slow" && !e.on);
  const h1 = ev.find((e) => e.type === "h1");
  return {
    contentMs: rel(h1),
    barShownMs: rel(barOn),
    barDoneMs: rel(barDone),
    barIdleMs: rel(barIdle),
    pulseOnMs: rel(slowOn),
    pulseOffMs: rel(slowOff),
    barOn,
    barDone,
    slowOn,
    finalBar: state.finalBar,
    finalSlow: state.finalSlow,
    events: ev.map((e) => ({ ...e, t: Math.round(e.t - state.t0) })),
  };
}

const timelineRow = (m) => ({
  contentMs: m.contentMs,
  barShownMs: m.barShownMs,
  pulseOnMs: m.pulseOnMs,
  barDoneMs: m.barDoneMs,
  pulseOffMs: m.pulseOffMs,
  barIdleMs: m.barIdleMs,
});

/* =========================== A. fast + prefetched =========================== */
{
  const { page, log, context } = await openPhone();
  await load(page, "/");
  const prefetched = log.rsc.some((r) => r.path === "/prices.txt" && r.prefetch && r.done);
  check("A precondition: /prices was prefetched (bottom nav is on screen)", prefetched);
  const m = await measureNavigation(page, { selector: 'nav[aria-label="Mobile"] a[href="/prices"]', expectPath: "/prices" });
  timelines["A fast, prefetched: / → /prices"] = timelineRow(m);
  check("A fast prefetched navigation shows no strip", m.barShownMs === null, `content at ${m.contentMs} ms`);
  check("A fast prefetched navigation never pulses the logo", m.pulseOnMs === null);
  check("A ends idle", m.finalBar === "idle" && !m.finalSlow);

  const hops = ["/trends", "/hustle", "/tools", "/"];
  const contents = [];
  let anyBar = false;
  for (const hop of hops) {
    const step = await measureNavigation(page, { selector: `nav[aria-label="Mobile"] a[href="${hop}"]`, expectPath: hop, settleMs: 500 });
    contents.push(`${hop} ${step.contentMs}ms`);
    if (step.barShownMs !== null || step.pulseOnMs !== null) anyBar = true;
  }
  check("A bottom-nav hops (prefetched) show no strip and no pulse", !anyBar, contents.join(", "));
  timelines["A bottom-nav hops"] = contents.join(", ");

  // Low-end phone: 4× CPU slowdown on the same prefetched hop (informational — a real >150 ms commit
  // may legitimately show the strip briefly; it must still never pulse below 300 ms or stick).
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const slowCpu = await measureNavigation(page, { selector: 'nav[aria-label="Mobile"] a[href="/prices"]', expectPath: "/prices" });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  timelines["A 4× CPU, prefetched: / → /prices"] = timelineRow(slowCpu);
  info("A 4× CPU prefetched hop", `content ${slowCpu.contentMs} ms, strip ${slowCpu.barShownMs ?? "not shown"}, pulse ${slowCpu.pulseOnMs ?? "none"}`);
  check("A 4× CPU hop never leaves an indicator behind", slowCpu.finalBar === "idle" && !slowCpu.finalSlow);
  check("A no page errors", log.errors.length === 0, log.errors.slice(0, 3).join(" | "));
  await context.close();
}

/* =========================== B. fast, not prefetched =========================== */
{
  const { page, log, context } = await openPhone();
  await load(page, "/");
  check("B precondition: footer /about was not prefetched", !log.rsc.some((r) => r.path === "/about.txt"));
  const m = await measureNavigation(page, { selector: 'footer a[href="/about"]', expectPath: "/about" });
  timelines["B fast, not prefetched: / → /about"] = timelineRow(m);
  check("B navigation fetched its payload on demand", log.rsc.some((r) => r.path === "/about.txt" && !r.prefetch));
  check("B fast on-demand navigation stays silent (< 150 ms)", m.contentMs < 150 ? m.barShownMs === null : true, `content at ${m.contentMs} ms`);
  check("B never pulses under 300 ms", m.contentMs < 300 ? m.pulseOnMs === null : true);
  await context.close();
}

/* =========================== C/D/E. throttled, not prefetched =========================== */
async function throttledScenario(label, network, { reducedMotion = false, target = "/privacy", shot = null, theme = null } = {}) {
  const { page, log, context } = await openPhone({ reducedMotion, theme });
  await load(page, "/");
  const brand = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.backgroundColor = "hsl(var(--primary))";
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { color, theme: document.documentElement.classList.contains("dark") ? "dark" : "light" };
  });
  check(`${label} precondition: footer ${target} was not prefetched`, !log.rsc.some((r) => r.path === `${target}.txt`));
  const oldH1 = await page.$eval("main h1", (el) => el.textContent.trim());
  await page.emulateNetworkConditions(network);
  const logoSamples = [];
  const m = await measureNavigation(page, {
    selector: `footer a[href="${target}"]`,
    expectPath: target,
    midFlight: async () => {
      await page.waitForFunction(() => document.documentElement.hasAttribute("data-nav-slow") || location.pathname !== "/", { timeout: 30_000 });
      for (let i = 0; i < 4; i += 1) {
        logoSamples.push(
          await page.$eval(".nav-logo-mark", (el) => ({
            transform: getComputedStyle(el).transform,
            slow: document.documentElement.hasAttribute("data-nav-slow"),
          })),
        );
        await sleep(170);
      }
      if (shot) {
        await page.screenshot({ path: path.join(shotsDir, `${shot}.png`) });
        await page.screenshot({ path: path.join(shotsDir, `${shot}-top.png`), clip: { x: 0, y: 0, width: 390, height: 64 } });
      }
    },
  });
  await page.emulateNetworkConditions(null);
  timelines[`${label}: / → ${target}`] = timelineRow(m);
  const slowEnough = m.contentMs > 420;
  check(`${label} navigation is genuinely slow (on-demand payload)`, slowEnough, `content at ${m.contentMs} ms`);
  check(`${label} strip appears at ≈150 ms`, within(m.barShownMs, 140, 280), `${m.barShownMs} ms`);
  check(`${label} logo pulse starts at ≈300 ms`, within(m.pulseOnMs, 290, 430), `${m.pulseOnMs} ms`);
  check(`${label} strip finishes in the commit frame`, within(m.barDoneMs - m.contentMs, -5, 50), `done ${m.barDoneMs} ms vs content ${m.contentMs} ms`);
  check(`${label} pulse stops in the commit frame`, within(m.pulseOffMs - m.contentMs, -5, 50), `off ${m.pulseOffMs} ms vs content ${m.contentMs} ms`);
  check(`${label} strip is gone ≈320 ms after content`, within(m.barIdleMs - m.barDoneMs, 280, 450), `${m.barIdleMs - m.barDoneMs} ms`);
  const on = m.barOn;
  check(`${label} strip geometry: fixed, top 0, 3px, full width, pointer-events none, above header`,
    on && on.position === "fixed" && on.rect.top === 0 && on.rect.height === 3 && on.rect.width === 390 && on.pointerEvents === "none" && Number(on.zIndex) > 40,
    on ? `${on.position} top=${on.rect.top} h=${on.rect.height} w=${on.rect.width} pe=${on.pointerEvents} z=${on.zIndex}` : "no strip");
  check(`${label} old page stays visible and tappable while pending (no overlay)`,
    on && on.h1 === oldH1 && on.center && !on.center.onStrip && on.center.inMain,
    on ? `h1="${on.h1}" center=${JSON.stringify(on.center)}` : "");
  const BRAND = { light: "rgb(0, 133, 80)", dark: "rgb(41, 174, 112)" }; // --primary: hsl(156 100% 26%) · hsl(152 62% 42%)
  check(`${label} strip uses the brand green (${brand.theme} theme)`, on && on.barColor === brand.color && on.barColor === BRAND[brand.theme],
    `${on?.barColor} vs --primary ${brand.color}`);
  if (!reducedMotion) {
    check(`${label} strip grows (CSS animation, no JS ticking)`, on?.barAnimation === "nav-progress-grow", on?.barAnimation);
    const whileSlow = logoSamples.filter((x) => x.slow).map((x) => x.transform);
    check(`${label} logo pulses while slow`, m.slowOn?.logoAnimation === "nav-logo-pulse" && new Set(whileSlow).size > 1,
      `${m.slowOn?.logoAnimation}; ${new Set(whileSlow).size} distinct transforms in ${whileSlow.length} samples while slow`);
    check(`${label} finish is a short fade`, m.barDone?.transitionDuration?.includes("0.2s"), m.barDone?.transitionDuration);
  } else {
    check(`${label} reduced motion: static full-width strip`, on?.barAnimation === "none" && on?.barTransform === "none" && on?.opacity === "1",
      `${on?.barAnimation} / ${on?.barTransform} / opacity ${on?.opacity}`);
    check(`${label} reduced motion: logo never animates`, m.slowOn?.logoAnimation === "none" && logoSamples.every((x) => x.transform === "none"),
      `${m.slowOn?.logoAnimation}; ${logoSamples.map((x) => x.transform).join(" ")}`);
    check(`${label} reduced motion: strip hides instantly at commit`, m.barDone?.opacity === "0" && m.barDone?.transitionDuration === "0s",
      `opacity ${m.barDone?.opacity}, transition ${m.barDone?.transitionDuration}`);
  }
  check(`${label} ends idle`, m.finalBar === "idle" && !m.finalSlow);
  check(`${label} no page errors`, log.errors.length === 0, log.errors.slice(0, 3).join(" | "));
  return { page, log, context };
}

{
  const { context } = await throttledScenario("C Fast 3G (light theme)", NETWORKS["Fast 3G"], { target: "/about", theme: "light", shot: "fast-3g-light-pending" });
  await context.close();
}
let traverse;
{
  traverse = await throttledScenario("D Slow 3G", NETWORKS["Slow 3G"], { target: "/privacy", shot: "slow-3g-pending" });
}
{
  const { context } = await throttledScenario("E Slow 3G + reduced motion", NETWORKS["Slow 3G"], { reducedMotion: true, target: "/privacy", shot: "reduced-motion-pending" });
  await context.close();
}

/* =========================== F. hash, same page, back/forward =========================== */
{
  const { page, context } = traverse; // on /privacy after the Slow 3G hop
  await page.emulateNetworkConditions(NETWORKS["Slow 3G"]);
  const back = await measureNavigation(page, { run: () => { window.__navQA.t0 = performance.now(); history.back(); }, expectPath: "/" });
  timelines["F back (Slow 3G): /privacy → /"] = timelineRow(back);
  check("F back navigation never leaves an indicator behind", back.finalBar === "idle" && !back.finalSlow, `content ${back.contentMs} ms, strip ${back.barShownMs ?? "not shown"}`);
  const fwd = await measureNavigation(page, { run: () => { window.__navQA.t0 = performance.now(); history.forward(); }, expectPath: "/privacy" });
  timelines["F forward (Slow 3G): / → /privacy"] = timelineRow(fwd);
  check("F forward navigation never leaves an indicator behind", fwd.finalBar === "idle" && !fwd.finalSlow, `content ${fwd.contentMs} ms, strip ${fwd.barShownMs ?? "not shown"}`);
  await page.emulateNetworkConditions(null);

  const quiet = async (label, run) => {
    await page.evaluate(() => (window.__navQA.events.length = 0));
    await page.evaluate(run);
    await sleep(900);
    const ev = await page.evaluate(() => window.__navQA.events.filter((e) => e.type !== "h1"));
    check(label, ev.length === 0, ev.length ? JSON.stringify(ev.map((e) => e.type + ":" + (e.state ?? e.on))) : "no strip, no pulse");
  };
  await quiet("F hash-only router transition shows nothing", () => window.next.router.push(`${location.pathname}#main`));
  await quiet("F same-page router transition shows nothing", () => window.next.router.push(location.pathname));
  await quiet("F skip link (#main) shows nothing", () => document.querySelector('a[href="#main"]').click());
  await context.close();
}

/* =========================== G. button-only spinners =========================== */
async function spinnerProbe(page, buttonSelector) {
  return page.evaluate((sel) => {
    const button = [...document.querySelectorAll("button")].find((b) => b.matches(sel));
    if (!button) return null;
    const spinner = button.querySelector("[data-inline-spinner]");
    return {
      busy: button.getAttribute("aria-busy"),
      text: button.textContent.trim(),
      spinner: Boolean(spinner),
      spinnerAnimation: spinner ? getComputedStyle(spinner).animationName : null,
      spinnerHidden: spinner ? spinner.getAttribute("aria-hidden") : null,
      strip: document.querySelector(".nav-progress")?.getAttribute("data-nav-progress"),
      slow: document.documentElement.hasAttribute("data-nav-slow"),
    };
  }, buttonSelector);
}

for (const reducedMotion of [false, true]) {
  const tag = reducedMotion ? " (reduced motion)" : "";
  const { page, log, context } = await openPhone({ reducedMotion });
  await load(page, "/hustle");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Unlock premium/.test(b.textContent))?.click());
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /\(demo\)/.test(b.textContent)), { timeout: 10_000 });
  await page.evaluate(() => {
    window.__payButton = [...document.querySelectorAll("button")].find((b) => /\(demo\)/.test(b.textContent));
    window.__payButton.setAttribute("data-qa-pay", "");
    window.__payButton.click();
  });
  await sleep(60);
  const early = await spinnerProbe(page, "[data-qa-pay]");
  await sleep(400);
  const mid = await spinnerProbe(page, "[data-qa-pay]");
  if (!reducedMotion) await page.screenshot({ path: path.join(shotsDir, "hustle-pay-spinner.png") });
  await sleep(1_500);
  const after = await spinnerProbe(page, "[data-qa-pay]");
  check(`G hustle pay${tag}: aria-busy at once, no spinner flash in the first 150 ms`, early?.busy === "true" && !early?.spinner, JSON.stringify(early));
  check(`G hustle pay${tag}: tiny spinner on the button while processing`, mid?.spinner && mid?.spinnerHidden === "true" && /Processing demo payment/.test(mid?.text ?? ""), JSON.stringify(mid));
  check(`G hustle pay${tag}: spinner ${reducedMotion ? "is static" : "rotates"}`, mid?.spinnerAnimation === (reducedMotion ? "none" : "inline-spin"), mid?.spinnerAnimation);
  check(`G hustle pay${tag}: page strip and logo stay idle (button-only feedback)`, mid?.strip === "idle" && !mid?.slow);
  check(`G hustle pay${tag}: spinner and aria-busy cleared when done`, !after || (!after.spinner && after.busy === null), JSON.stringify(after));
  check(`G hustle${tag}: no page errors`, log.errors.length === 0, log.errors.slice(0, 3).join(" | "));
  await context.close();
}

{
  const { page, log, context } = await openPhone({ bypassServiceWorker: false, grantNotifications: true, incognito: false });
  await load(page, "/status");
  const ready = await page
    .waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent.trim() === "Enable alerts" && !b.disabled), { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  check("G push settings reach the Enable state with the mocked API", ready);
  if (ready) {
    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Enable alerts" && !b.disabled);
      button.setAttribute("data-qa-push", "");
      button.click();
    });
    const samples = [];
    const t0 = Date.now();
    let sawSpinner = false;
    let sawBusy = false;
    let stripOrPulse = false;
    while (Date.now() - t0 < 15_000) {
      const p = await spinnerProbe(page, "[data-qa-push]");
      if (!p) break;
      samples.push(p);
      if (p.spinner) sawSpinner = true;
      if (p.busy === "true") sawBusy = true;
      if (p.strip !== "idle" || p.slow) stripOrPulse = true;
      if (sawBusy && p.busy === null) break;
      await sleep(50);
    }
    const last = samples.at(-1);
    const message = await page.evaluate(() => {
      const button = document.querySelector("[data-qa-push]");
      const card = button?.closest("section") ?? button?.parentElement?.parentElement;
      return (card?.innerText ?? "").replace(/\s+/g, " ").trim();
    });
    check("G push enable: aria-busy while enabling", sawBusy);
    check("G push enable: button-only spinner shown while enabling", sawSpinner, `${samples.length} samples over ${Date.now() - t0} ms`);
    check("G push enable: page strip and logo stay idle", !stripOrPulse);
    check("G push enable: spinner and aria-busy cleared when the flow settles", last && !last.spinner && last.busy === null, `final button "${last?.text}"`);
    info("G push enable outcome in headless Chromium", `button "${last?.text}"; message "${message.slice(-220)}"`);
  }
  check("G push: no page errors", log.errors.length === 0, log.errors.slice(0, 3).join(" | "));
  await page.close();
  void context;
}

/* =========================== H. search Enter = client navigation =========================== */
{
  const { page, log, context } = await openPhone();
  await load(page, "/");
  await page.evaluate(() => (window.__qaSameDocument = true));
  // The header renders a desktop and a mobile search box; on a phone only #site-search-mobile is visible.
  await page.type("#site-search-mobile", "rice", { delay: 25 });
  await page.waitForFunction(() => document.querySelectorAll('#site-search-mobile-results [role="option"]').length > 0, { timeout: 20_000 });
  const target = await page.$eval('#site-search-mobile-results [role="option"]', (a) => new URL(a.href).pathname);
  await page.emulateNetworkConditions(NETWORKS["Fast 3G"]);
  const m = await measureNavigation(page, {
    run: () => {
      window.__navQA.t0 = performance.now();
      document.querySelector("#site-search-mobile").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    },
    expectPath: target,
  });
  await page.emulateNetworkConditions(null);
  timelines[`H search Enter (Fast 3G): / → ${target}`] = timelineRow(m);
  const sameDocument = await page.evaluate(() => window.__qaSameDocument === true);
  check("H search Enter is a client navigation (no full reload)", sameDocument, `→ ${target}, content at ${m.contentMs} ms`);
  check("H search Enter leaves no indicator behind", m.finalBar === "idle" && !m.finalSlow, `strip ${m.barShownMs ?? "not shown"}, pulse ${m.pulseOnMs ?? "none"}`);
  check("H search: no page errors", log.errors.length === 0, log.errors.slice(0, 3).join(" | "));
  await context.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
const assertions = results.filter((r) => !r.info);
fs.writeFileSync(path.join(shotsDir, "results.json"), JSON.stringify({ base, results, timelines }, null, 2));
console.log("\nTimelines (ms after the tap):");
for (const [name, row] of Object.entries(timelines)) console.log(`  ${name}: ${typeof row === "string" ? row : JSON.stringify(row)}`);
console.log(
  `\n${assertions.length - failed.length}/${assertions.length} checks passed (+${results.length - assertions.length} informational); screenshots + results.json in ${shotsDir}`,
);
process.exit(failed.length ? 1 : 0);
