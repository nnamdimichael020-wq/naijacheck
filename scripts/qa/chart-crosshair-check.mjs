#!/usr/bin/env node
/**
 * Real-browser check for the chart crosshair read-out (TradingView-style scrub).
 *
 * Serves the static export in out/, emulates a 390×844 touch phone and a 1280×900 mouse desktop,
 * scrubs the homepage sparkline and /charts/parallel-usd-buy, and asserts that:
 *   - the crosshair responds on the first touch and snaps to a STORED reading (vertical + horizontal
 *     line on a real polyline vertex; HUD price is a value in data/history.json);
 *   - the floating HUD, the value-axis price pill and the time pill appear, agree with each other and
 *     are not clipped by the card;
 *   - lifting the finger / moving the mouse away returns to "Latest reading";
 *   - a vertical finger drag on the plot still scrolls the page (touch-action: pan-y).
 *
 * This is emulation in desktop Chromium, not a physical phone — see
 * docs/runbooks/chart-pages.md ("Phone check") for the on-device steps.
 *
 * Usage:
 *   npm run build
 *   npm i --no-save puppeteer-core@23            # or set PUPPETEER_MODULE_DIR to an existing install
 *   CHROME_PATH=/path/to/chrome node scripts/qa/chart-crosshair-check.mjs [--out /tmp/chart-qa]
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve("out");
const outArg = process.argv.indexOf("--out");
const shotsDir = path.resolve(outArg > -1 ? process.argv[outArg + 1] : "/tmp/chart-crosshair-qa");
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

/* ---------- stored readings: the only values the HUD may ever show ---------- */
const history = JSON.parse(fs.readFileSync(path.resolve("data/history.json"), "utf8"));
const storedValues = (dataset) => new Set(history.points.filter((p) => p.dataset === dataset).map((p) => p.value));
const PARALLEL = storedValues("parallel-usd-ngn-buy");
const nairaToNumber = (text) => Number(String(text).replace(/[^\d.]/g, ""));

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
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "ok" : "FAIL"} - ${name}${detail ? ` (${detail})` : ""}`);
};

const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
});

const nextFrame = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Snapshot of one interactive chart: HUD copy, crosshair geometry, vertices and pill boxes. */
async function readChart(page, plotSelector) {
  return page.$eval(plotSelector, (plot) => {
    // Both chart cards are `.rounded-lg` (the plot itself is only rounded-sm).
    const cardEl = plot.closest(".rounded-lg") ?? document.body;
    const hud = cardEl.querySelector("[data-chart-hud]");
    const polyline = plot.querySelector("polyline");
    const vertices = (polyline?.getAttribute("points") ?? "").trim().split(/\s+/).map((c) => c.split(",").map(Number));
    const vertical = plot.querySelector('[data-crosshair="vertical"]');
    const horizontal = plot.querySelector('[data-crosshair="horizontal"]');
    const rect = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
    return {
      scrubbing: plot.getAttribute("data-scrubbing"),
      hudMode: hud?.getAttribute("data-chart-hud") ?? null,
      hudLabel: hud?.querySelector('[data-hud="label"]')?.textContent ?? null,
      hudPrice: hud?.querySelector('[data-hud="price"]')?.textContent ?? null,
      hudTime: hud?.querySelector('[data-hud="time"]')?.textContent ?? null,
      hudDelta: hud?.querySelector('[data-hud="delta"]')?.textContent ?? null,
      verticalX: vertical ? Number(vertical.getAttribute("x1")) : null,
      horizontalY: horizontal ? Number(horizontal.getAttribute("y1")) : null,
      vertices,
      pricePill: cardEl.querySelector('[data-chart-callout="price"]')?.textContent ?? null,
      timePill: cardEl.querySelector('[data-chart-callout="time"]')?.textContent ?? null,
      boxes: {
        card: rect(cardEl),
        plot: rect(plot),
        hud: rect(hud),
        pricePill: rect(cardEl.querySelector('[data-chart-callout="price"]')),
        timePill: rect(cardEl.querySelector('[data-chart-callout="time"]')),
      },
    };
  });
}

const inside = (inner, outer, slack = 1) =>
  inner && outer && inner.left >= outer.left - slack && inner.right <= outer.right + slack && inner.top >= outer.top - slack && inner.bottom <= outer.bottom + slack;
const onVertex = (state) => state.vertices.some(([x, y]) => x === state.verticalX && y === state.horizontalY);

async function touch(client, type, x, y) {
  await client.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
}

async function phoneScrub(label, url, plotSelector, { axisPills }) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    // /api/* is served by the Cloudflare Worker, not by a plain out/ server: a 404 there is expected.
    if (/\/api\//.test(message.location()?.url ?? "")) return;
    errors.push(`${message.text()} ${message.location()?.url ?? ""}`.trim());
  });
  await page.emulate({
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  });
  await page.goto(`${base}${url}`, { waitUntil: "networkidle0" });
  const client = await page.target().createCDPSession();
  /** Centre the plot (instantly) and measure it fresh, right before touching it. */
  const aim = async () => {
    await page.$eval(plotSelector, (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
    await nextFrame(page);
    return page.$eval(plotSelector, (el) => el.getBoundingClientRect().toJSON());
  };
  // Phone-screen screenshots (viewport only, so taking one never scrolls the page mid-gesture).
  const shot = (name) => page.screenshot({ path: path.join(shotsDir, name) });

  let box = await aim();
  const idle = await readChart(page, plotSelector);
  check(`${label}: idle state rests on the latest reading`, idle.hudMode === "latest" && idle.hudLabel === "Latest reading", idle.hudLabel ?? "");
  check(`${label}: idle crosshair sits on the latest vertex`, onVertex(idle) && idle.verticalX === idle.vertices.at(-1)[0]);
  await shot(`${label}-idle.png`);

  // First contact: the crosshair must respond before any movement.
  box = await aim();
  const y = box.top + box.height / 2;
  await touch(client, "touchStart", box.left + box.width * 0.22, y);
  await nextFrame(page);
  const first = await readChart(page, plotSelector);
  check(`${label}: responds on first touch (no movement yet)`, first.scrubbing === "true" && first.hudLabel === "Selected reading", first.hudLabel ?? "");

  // Drag horizontally across the plot.
  const seen = new Set();
  let snappedEverywhere = true;
  let storedEverywhere = true;
  for (const f of [0.3, 0.45, 0.6, 0.75]) {
    await touch(client, "touchMove", box.left + box.width * f, y);
    await nextFrame(page);
    const state = await readChart(page, plotSelector);
    seen.add(`${state.hudPrice} ${state.hudTime}`);
    snappedEverywhere &&= onVertex(state);
    storedEverywhere &&= PARALLEL.has(nairaToNumber(state.hudPrice));
  }
  const mid = await readChart(page, plotSelector);
  await shot(`${label}-scrub.png`);
  check(`${label}: still scrubbing while the finger is down`, mid.scrubbing === "true" && mid.hudLabel === "Selected reading");
  check(`${label}: both crosshair lines sit on a stored vertex at every drag step`, snappedEverywhere);
  check(`${label}: HUD price is always a stored reading`, storedEverywhere, mid.hudPrice ?? "");
  check(`${label}: HUD follows the finger to different readings`, seen.size >= 2, [...seen].join(" | "));
  check(`${label}: HUD shows a full WAT date/time`, /^\d{1,2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} (am|pm) WAT$/.test(mid.hudTime ?? ""), mid.hudTime ?? "");
  check(`${label}: HUD is inside the card (not clipped)`, inside(mid.boxes.hud, mid.boxes.card));
  check(`${label}: HUD does not cover the plot`, mid.boxes.hud.bottom <= mid.boxes.plot.top + 1);
  if (axisPills) {
    check(`${label}: price pill shows the HUD's stored price`, mid.pricePill === mid.hudPrice, `${mid.pricePill} vs ${mid.hudPrice}`);
    const hudShort = (mid.hudTime ?? "").replace(/^(\d{1,2} [A-Z][a-z]{2}) \d{4},/, "$1,");
    check(`${label}: time pill shows the HUD's stored time`, mid.timePill === hudShort, `${mid.timePill} vs ${hudShort}`);
    check(`${label}: price pill inside the card`, inside(mid.boxes.pricePill, mid.boxes.card));
    check(`${label}: time pill inside the card`, inside(mid.boxes.timePill, mid.boxes.card));
  }

  await touch(client, "touchEnd");
  await nextFrame(page);
  const lifted = await readChart(page, plotSelector);
  check(`${label}: lifting the finger returns to "Latest reading"`, lifted.hudLabel === "Latest reading" && lifted.scrubbing === "false");

  // Vertical drag on the plot must still scroll the page (touch-action: pan-y).
  box = await aim();
  const before = await page.evaluate(() => window.scrollY);
  const startX = box.left + box.width * 0.5;
  const startY = box.top + box.height / 2;
  await touch(client, "touchStart", startX, startY);
  for (let step = 1; step <= 10; step += 1) {
    await touch(client, "touchMove", startX, startY - step * 22);
    await nextFrame(page);
  }
  await touch(client, "touchEnd");
  await new Promise((r) => setTimeout(r, 400));
  const after = await page.evaluate(() => window.scrollY);
  const afterScroll = await readChart(page, plotSelector);
  check(`${label}: vertical finger drag still scrolls the page`, after > before + 50, `scrollY ${before} → ${after}`);
  check(`${label}: after a scroll the chart shows the latest reading`, afterScroll.hudLabel === "Latest reading");
  check(`${label}: no console errors or hydration warnings`, errors.length === 0, errors.slice(0, 2).join(" | "));
  await page.close();
  return mid;
}

async function desktopHover() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}/charts/parallel-usd-buy`, { waitUntil: "networkidle0" });
  const selector = "[data-scrubbing]";
  await page.$eval(selector, (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await nextFrame(page);
  const box = await page.$eval(selector, (el) => el.getBoundingClientRect().toJSON());
  await page.mouse.move(box.left + box.width * 0.4, box.top + box.height / 2);
  await nextFrame(page);
  const hovered = await readChart(page, selector);
  check("desktop: mouse hover selects a stored reading", hovered.hudLabel === "Selected reading" && onVertex(hovered) && PARALLEL.has(nairaToNumber(hovered.hudPrice)));
  await page.screenshot({ path: path.join(shotsDir, "desktop-chart-hover.png") });
  await page.mouse.move(box.left + box.width * 0.4, box.top - 200);
  await nextFrame(page);
  const left = await readChart(page, selector);
  check("desktop: moving the mouse off the plot returns to the latest reading", left.hudLabel === "Latest reading");
  await page.focus(selector);
  await page.keyboard.press("Home");
  await nextFrame(page);
  const home = await readChart(page, selector);
  check("desktop: Home key selects the earliest stored reading", home.verticalX === home.vertices[0][0] && home.hudLabel === "Selected reading");
  await page.keyboard.press("Escape");
  await nextFrame(page);
  check("desktop: Escape returns to the latest reading", (await readChart(page, selector)).hudLabel === "Latest reading");
  await page.close();
}

try {
  // Homepage: the parallel USD sparkline in the Daily Briefing.
  await phoneScrub("home-sparkline", "/", "section[aria-labelledby='daily-briefing-heading'] [data-scrubbing]", { axisPills: false });
  await phoneScrub("charts-parallel-usd-buy", "/charts/parallel-usd-buy", "[data-scrubbing]", { axisPills: true });
  await desktopHover();
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
fs.writeFileSync(path.join(shotsDir, "results.json"), JSON.stringify({ base, chrome: chromePath, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed · screenshots in ${shotsDir}`);
if (failed.length) process.exit(1);
