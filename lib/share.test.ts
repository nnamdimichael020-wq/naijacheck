/**
 * Share prefill guard.
 *
 * These tests pin the only things a share may carry: a public title, one short
 * dated factual line and the canonical public URL. They also prove that:
 *   - WhatsApp uses `https://wa.me/?text=` with the URL inside the text;
 *   - X uses `https://twitter.com/intent/tweet?text=...&url=...`;
 *   - no @mention or `via=` is emitted while `SITE_CONFIG.xHandle` is empty;
 *   - a malformed or unverified handle can never create a fake mention;
 *   - preview hosts, localhost and other domains fall back to the canonical site;
 *   - every generated article summary is dated and makes no "live"/"today" claim.
 *
 * Run with: npm run share:test
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITE_CONFIG } from "../config/site";
import {
  MAX_X_TEXT_LENGTH,
  articleShareSummary,
  clampShareText,
  cleanShareText,
  formatShareDate,
  normalizeXHandle,
  publicShareUrl,
  shareLinks,
  shareText,
  whatsappShareUrl,
  xShareUrl,
} from "./share";

const target = {
  title: "Dated Petrol Pump References and Monitored Depot Fuel",
  summary: "indicative prices dated 9 October 2026",
  url: "https://naijacheck.ng/prices/fuel",
};

function xParams(href: string): URLSearchParams {
  return new URL(href).searchParams;
}

function run(): void {
  /* ---------- text rules ---------- */
  assert.equal(cleanShareText("  Lagos \n  fuel\t page "), "Lagos fuel page");
  assert.equal(shareText({ title: "  Lagos  fuel ", summary: "  depot   medians " }), "Lagos fuel — depot medians");
  assert.equal(shareText({ title: "Only a title" }), "Only a title");
  assert.equal(shareText({ title: "   ", summary: "" }), SITE_CONFIG.name, "a blank title falls back to the site name");
  assert.equal(formatShareDate("2026-10-09"), "9 October 2026");
  assert.equal(formatShareDate("2026-10-19T04:06:00.000Z"), "19 October 2026");
  assert.equal(formatShareDate("not a date"), "not a date");

  /* ---------- canonical URL safety ---------- */
  assert.equal(publicShareUrl("https://naijacheck.ng/prices/fuel/"), "https://naijacheck.ng/prices/fuel");
  assert.equal(publicShareUrl("https://naijacheck.ng"), "https://naijacheck.ng/");
  assert.equal(publicShareUrl("https://naijacheck.ng/?utm_source=chat"), "https://naijacheck.ng/", "tracking params never leave the page");
  assert.equal(publicShareUrl(undefined), "https://naijacheck.ng/");
  assert.equal(publicShareUrl("http://naijacheck.ng/prices"), "https://naijacheck.ng/", "plain http is not canonical");
  assert.equal(publicShareUrl("https://www.naijacheck.ng/prices"), "https://naijacheck.ng/", "a lookalike subdomain is rejected");
  assert.equal(publicShareUrl("https://evil.example/prices"), "https://naijacheck.ng/", "another origin is rejected");
  assert.equal(publicShareUrl("javascript:alert(1)"), "https://naijacheck.ng/", "non-http schemes are rejected");
  assert.equal(publicShareUrl("http://localhost:3000/"), "https://naijacheck.ng/", "localhost never leaves the page");

  /* ---------- WhatsApp ---------- */
  const wa = whatsappShareUrl(target);
  assert.ok(wa.startsWith("https://wa.me/?text="), "WhatsApp uses the documented wa.me text parameter");
  assert.ok(!/\+/.test(wa.slice("https://wa.me/?text=".length)), "the payload is encodeURIComponent-encoded (%20, not +)");
  const waUrl = new URL(wa);
  assert.equal(waUrl.hostname, "wa.me");
  assert.equal(waUrl.pathname, "/");
  const waText = waUrl.searchParams.get("text") ?? "";
  assert.equal(waText, `${shareText(target)} ${target.url}`, "WhatsApp carries title, dated line and URL");
  assert.ok(waText.endsWith(target.url));
  assert.ok(!waText.includes("@"), "no handle is prefilled while no real X handle exists");

  /* ---------- X ---------- */
  const x = xShareUrl(target);
  assert.ok(x.startsWith("https://twitter.com/intent/tweet?text="), "X uses the intent endpoint required by the brief");
  assert.ok(!x.includes("via="), "no via= parameter without a real handle");
  assert.ok(!x.includes("@"), "no @ mention without a real handle");
  const px = xParams(x);
  assert.equal(px.get("text"), shareText(target), "X text carries the title and dated line");
  assert.equal(px.get("url"), target.url, "X carries the canonical URL separately");
  assert.ok(!(px.get("text") ?? "").includes(target.url), "the URL is not duplicated inside the tweet text");
  assert.ok(x.indexOf("?text=") < x.indexOf("&url="), "text comes first, then url");

  /* ---------- handles ---------- */
  assert.equal(SITE_CONFIG.xHandle, "", "no X account has been verified, so the committed handle stays empty");
  assert.equal(normalizeXHandle("@NaijaCheck"), "NaijaCheck");
  assert.equal(normalizeXHandle("  naija_check9 "), "naija_check9");
  assert.equal(normalizeXHandle("naijacheck"), "naijacheck");
  assert.equal(normalizeXHandle(""), null);
  assert.equal(normalizeXHandle(undefined), null);
  assert.equal(normalizeXHandle("bad handle"), null, "spaces are rejected");
  assert.equal(normalizeXHandle("bad-handle"), null, "hyphens are rejected");
  assert.equal(normalizeXHandle("sixteencharacters"), null, "handles longer than 15 characters are rejected");
  assert.equal(normalizeXHandle("@"), null);

  const withValidHandle = xShareUrl(target, "@NaijaCheck");
  assert.equal(xParams(withValidHandle).get("via"), "NaijaCheck", "a valid handle becomes via= without @");
  assert.ok(!withValidHandle.includes("@"), "the @ symbol never appears in the intent URL");
  assert.equal(xParams(xShareUrl(target, "not a handle")).get("via"), null, "an invalid configured handle is ignored");
  assert.equal(xParams(xShareUrl(target, null)).get("via"), null);

  /* ---------- clamping ---------- */
  const longTitle = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
  const clamped = clampShareText(longTitle);
  assert.ok(clamped.length <= MAX_X_TEXT_LENGTH, "X text stays inside the budget");
  assert.ok(clamped.endsWith("…"), "clamped text ends with an ellipsis");
  assert.ok(!/\s{2,}/.test(clamped), "clamping leaves single spacing");
  assert.equal(clampShareText("short title"), "short title");

  const longX = xParams(xShareUrl({ ...target, title: longTitle }));
  assert.ok((longX.get("text") ?? "").length <= MAX_X_TEXT_LENGTH, "the long title is clamped in the real X intent");
  assert.ok((longX.get("url") ?? "").length > 0, "the URL survives clamping");

  /* ---------- both links ---------- */
  const links = shareLinks(target);
  assert.equal(links.whatsapp, wa);
  assert.equal(links.x, x);

  /* ---------- generated article summaries ---------- */
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/generated/articles.json"), "utf8"));
  const articles: Array<{ path: string; section: string; updatedAt: string; lastVerified?: string }> = Array.isArray(raw) ? raw : raw.articles ?? [];
  assert.ok(articles.length > 100, "the generated corpus is present");
  for (const article of articles) {
    const summary = articleShareSummary(article);
    assert.ok(summary.trim().length > 0, `${article.path} has a factual share line`);
    assert.ok(/\d{4}/.test(summary), `${article.path} share line carries a year`);
    assert.ok(!/\blive\b/i.test(summary), `${article.path} share line makes no "live" claim`);
    assert.ok(!/\btoday\b/i.test(summary), `${article.path} share line makes no "today" claim`);
    assert.ok(!/@/.test(summary), `${article.path} share line invents no handle`);
  }
  assert.equal(articleShareSummary({ section: "howto", updatedAt: "2026-10-09", lastVerified: "2026-10-08" }), "fee and steps checked against official sources, 8 October 2026");
  assert.equal(articleShareSummary({ section: "howto", updatedAt: "2026-10-09" }), "fee and steps guide dated 9 October 2026");
  assert.equal(articleShareSummary({ section: "prices-city", updatedAt: "2026-10-09" }), "indicative prices dated 9 October 2026");
  assert.equal(articleShareSummary({ section: "prices-static", updatedAt: "2026-10-09" }), "indicative prices dated 9 October 2026");
  assert.equal(articleShareSummary({ section: "tools", updatedAt: "2026-10-09" }), "calculator updated 9 October 2026");
  assert.equal(articleShareSummary({ section: "exam", updatedAt: "2026-10-09" }), "cut-offs and fees dated 9 October 2026");

  /* ---------- component wiring ---------- */
  // Source-level guard so `npm test` fails if an explicit network button is removed,
  // made hover-only, shrunk below the 44px target or detached from the tested URL builder.
  const component = fs.readFileSync(path.join(process.cwd(), "components/share-controls.tsx"), "utf8");
  assert.ok(component.includes("href={links.whatsapp}"), "WhatsApp is a real anchor, not a JS-only handler");
  assert.ok(component.includes("href={links.x}"), "X is a real anchor, not a JS-only handler");
  assert.ok(component.includes('data-share-target="whatsapp"') && component.includes('data-share-target="x"'), "both network anchors are identifiable");
  assert.ok((component.match(/\bmin-h-11\b/g) ?? []).length >= 3, "every share target meets the 44px touch height");
  assert.ok((component.match(/\bmin-w-11\b/g) ?? []).length >= 3, "every share target meets the 44px touch width");
  assert.ok(component.includes("navigator.share"), "the native share sheet is still preferred where supported");
  assert.ok(component.includes('role="group"'), "the share row is announced as one labelled group");
  assert.ok(component.includes('rel="noopener noreferrer"'), "outbound share links are safely isolated");
  assert.ok(!/window\.open\(/.test(component), "WhatsApp/X use normal links so middle-click and no-JS both work");

  console.log("Share tests passed (WhatsApp + X prefills carry only public title, dated line and canonical URL; no unverified handle).");
}

run();
