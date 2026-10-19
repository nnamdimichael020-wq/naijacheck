import fs from "node:fs";
import path from "node:path";

const root = path.resolve("out");
// Deliberately follows the unchanged main-branch canonical configuration.
const expectedOrigin = "https://naijacheck.ng";
if (!fs.existsSync(root)) throw new Error("out/ is missing; run npm run build first");

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(root);
// Google Search Console's site-verification token is a bare token file copied from public/,
// not a content page: it has no title, description, canonical or H1 by design, and it is
// deliberately absent from the sitemap. Exclude only that file shape from the page checks.
const isSearchConsoleToken = (file) => /(^|[\\/])google[0-9a-z]+\.html$/i.test(file);
const htmlFiles = files.filter((f) => f.endsWith(".html") && !isSearchConsoleToken(f));
const routeFor = (file) => {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (rel === "index.html") return "/";
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"/index.html".length);
  return "/" + rel.slice(0, -5);
};
const routes = new Map(htmlFiles.map((f) => [routeFor(f), f]));
const text = (html, pattern) => (html.match(pattern)?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const attr = (html, pattern) => html.match(pattern)?.[1] ?? "";
const normalPath = (href) => {
  try {
    const u = new URL(href, expectedOrigin);
    if (u.origin !== expectedOrigin) return null;
    return decodeURI(u.pathname).replace(/\/$/, "") || "/";
  } catch { return null; }
};
const assetPaths = new Set(files.map((f) => "/" + path.relative(root, f).replaceAll(path.sep, "/")));
const rows = [];
const broken = [];
const brokenImageAssets = [];
/**
 * WhatsApp + X share coverage. Every public page that ships the site shell must
 * expose both explicit network links, pre-filled with only its title/dated line
 * and canonical URL. /admin, /404 and the offline shell must never carry share.
 */
const shareExcludedRoutes = new Set(["/admin", "/404", "/offline"]);
const share = {
  pagesMissingWhatsApp: [],
  pagesMissingX: [],
  mismatchedSharePairs: [],
  excludedRoutesWithShare: [],
  malformedWhatsApp: [],
  malformedX: [],
  anchorMissingTargetRelOrLabel: [],
  anchorBelow44px: [],
};
const shareExpectedUrl = (route) => `${expectedOrigin}${route === "/" ? "/" : route}`;
const anchorAttribute = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? "";
/** React escapes text in href attributes (`&#x27;` for an apostrophe), so decode before URL parsing. */
const decodeHtmlAttribute = (value) =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
const checkShareAnchorChrome = (route, network, tag) => {
  if (anchorAttribute(tag, "target") !== "_blank") {
    share.anchorMissingTargetRelOrLabel.push({ route, network, missing: "target=_blank" });
  }
  const rel = anchorAttribute(tag, "rel").toLowerCase();
  if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
    share.anchorMissingTargetRelOrLabel.push({ route, network, missing: "rel=noopener noreferrer" });
  }
  if (!anchorAttribute(tag, "aria-label").trim()) {
    share.anchorMissingTargetRelOrLabel.push({ route, network, missing: "aria-label" });
  }
  const className = anchorAttribute(tag, "class");
  if (!/\bmin-h-11\b/.test(className) || !/\bmin-w-11\b/.test(className)) {
    share.anchorBelow44px.push({ route, network });
  }
};
const articleImagesMissingDimensionsOrAlt = [];
const pureDataPagesWithArticleImages = [];
const howtoWithHeroRoutes = [];
const howtoWithoutHeroRoutes = [];
const badJsonLd = [];
const pureDataRouteRe = /^(\/status|\/prices(?:\/|$)|\/tools(?:\/|$))/;
// Hero motion policy: the exact flagship allowlist is read from the committed
// config/site.ts source (same durability pattern as the Telegram channel URL below),
// then compared against the built HTML/CSS so motion can never leak site-wide.
const siteSource = fs.readFileSync(path.join(process.cwd(), "config", "site.ts"), "utf8");
const heroMotionAllowlist = [...(siteSource.match(/HERO_MOTION_ALLOWLIST\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? "").matchAll(/"([^"]*)"/g)].map((m) => m[1]);
const heroMotion = {
  allowlist: heroMotionAllowlist,
  routesWithMotionClass: [],
  offAllowlistWithMotionClass: [],
  forbiddenRoutesWithMotionClass: [],
  allowlistedRoutesWithoutHero: [],
  allowlistedHeroMissingMotionClass: [],
  motionOnPagesWithoutHero: [],
  motionClassOutsideHeroImg: [],
  videoOrAudioTagsOnRoutes: [],
};
const forbiddenMotionRouteRe = /^(\/status|\/tools(?:\/|$)|\/prices(?:\/|$)|\/hustle(?:\/|$))/;
for (const [route, file] of routes) {
  const html = fs.readFileSync(file, "utf8");
  const title = text(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || attr(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i) || attr(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  const h1 = text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"'#]+)(?:#[^"']*)?["']/gi)].map((m) => m[1]);
  const visible = text(html, /<body[^>]*>([\s\S]*?)<\/body>/i);
  const externalSourceLinks = hrefs.filter((href) => /^https?:\/\//i.test(href) && !href.startsWith(expectedOrigin));
  const freshnessMarkers = [...visible.matchAll(/.{0,55}(?:source as of|checked:|updated|dated|unverified|stale|seeded|unavailable).{0,90}/gi)].map((match) => match[0].trim()).slice(0, 8);
  for (const href of hrefs) {
    const p = normalPath(href);
    if (p === null || p.startsWith("/api/")) continue;
    const exists = routes.has(p) || assetPaths.has(p) || assetPaths.has(`${p}.html`) || assetPaths.has(`${p}/index.html`);
    if (!exists) broken.push({ from: route, href: p });
  }
  const imgTags = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const tag of imgTags) {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
    const p = normalPath(src);
    if (p && !assetPaths.has(p)) {
      brokenImageAssets.push({ from: route, src: p });
    }
  }
  const hasHeroFigure = /data-article-image=["']hero["']/i.test(html);
  const hasBodyFigure = /data-article-image=["']body["']/i.test(html);
  if (route.startsWith("/howto/")) {
    if (hasHeroFigure) howtoWithHeroRoutes.push(route);
    else howtoWithoutHeroRoutes.push(route);
  }
  // ---- hero motion checks (ignore RSC flight payloads inside <script>) ----
  const htmlNoScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  const hasMotionClass = /article-hero-motion/.test(htmlNoScripts);
  const motionEligible = hasHeroFigure || route === "/";
  if (hasMotionClass) {
    heroMotion.routesWithMotionClass.push(route);
    if (!heroMotionAllowlist.includes(route)) heroMotion.offAllowlistWithMotionClass.push(route);
    if (forbiddenMotionRouteRe.test(route)) heroMotion.forbiddenRoutesWithMotionClass.push(route);
    if (!motionEligible) heroMotion.motionOnPagesWithoutHero.push(route);
    for (const tag of htmlNoScripts.matchAll(/<[^>]+>/g)) {
      if (tag[0].includes("article-hero-motion") && !/^<img\b/i.test(tag[0])) {
        heroMotion.motionClassOutsideHeroImg.push(route);
        break;
      }
    }
  }
  if (heroMotionAllowlist.includes(route)) {
    if (!motionEligible) heroMotion.allowlistedRoutesWithoutHero.push(route);
    else if (!hasMotionClass) heroMotion.allowlistedHeroMissingMotionClass.push(route);
  }
  if (/<video\b|<audio\b/i.test(htmlNoScripts)) heroMotion.videoOrAudioTagsOnRoutes.push(route);
  if (pureDataRouteRe.test(route) && !route.startsWith("/prices/markets/") && (hasHeroFigure || hasBodyFigure)) {
    pureDataPagesWithArticleImages.push(route);
  }
  const articleFigures = [...html.matchAll(/<figure[^>]*data-article-image=["'](hero|body)["'][^>]*>([\s\S]*?)<\/figure>/gi)];
  for (const [, kind, figHtml] of articleFigures) {
    const imgTag = figHtml.match(/<img\b[^>]*>/i)?.[0] ?? "";
    const w = imgTag.match(/\bwidth=["'](\d+)["']/i)?.[1];
    const h = imgTag.match(/\bheight=["'](\d+)["']/i)?.[1];
    const altText = imgTag.match(/\balt=["']([^"']*)["']/i)?.[1]?.trim() ?? "";
    const lazy = /\bloading=["']lazy["']/i.test(imgTag);
    if (!w || !h || !altText || !lazy) {
      articleImagesMissingDimensionsOrAlt.push({ route, kind, hasWidth: Boolean(w), hasHeight: Boolean(h), hasAlt: Boolean(altText), lazy });
    }
  }
  const ldScripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of ldScripts) try { JSON.parse(raw); } catch (e) { badJsonLd.push({ route, error: e.message }); }

  // ---- WhatsApp + X share coverage (client-component markup, not the RSC payload) ----
  const htmlForShare = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ");
  const shareAnchors = [...htmlForShare.matchAll(/<a\b[^>]*\bdata-share-target=["'](whatsapp|x)["'][^>]*>/gi)].map((m) => ({
    network: m[1].toLowerCase(),
    tag: m[0],
  }));
  const waAnchors = shareAnchors.filter((a) => a.network === "whatsapp");
  const xAnchors = shareAnchors.filter((a) => a.network === "x");
  const anyShareHref = hrefs.some((href) => href.startsWith("https://wa.me/") || href.startsWith("https://twitter.com/intent/tweet"));
  if (shareExcludedRoutes.has(route) && (waAnchors.length || xAnchors.length || anyShareHref)) {
    share.excludedRoutesWithShare.push(route);
  } else if (!shareExcludedRoutes.has(route)) {
    const expected = shareExpectedUrl(route);
    if (!waAnchors.length) share.pagesMissingWhatsApp.push(route);
    if (!xAnchors.length) share.pagesMissingX.push(route);
    if (waAnchors.length !== xAnchors.length) share.mismatchedSharePairs.push({ route, whatsapp: waAnchors.length, x: xAnchors.length });
    for (const anchor of waAnchors) {
      const href = decodeHtmlAttribute(anchorAttribute(anchor.tag, "href"));
      if (!href.startsWith("https://wa.me/?text=")) {
        share.malformedWhatsApp.push({ route, reason: "href prefix", href });
        continue;
      }
      checkShareAnchorChrome(route, "whatsapp", anchor.tag);
      let waText = "";
      try {
        waText = new URL(href).searchParams.get("text") ?? "";
      } catch {
        share.malformedWhatsApp.push({ route, reason: "unparseable", href });
        continue;
      }
      if (!waText.endsWith(expected)) {
        share.malformedWhatsApp.push({ route, reason: "canonical URL missing from text", text: waText });
      }
      if (/\blive\b/i.test(waText)) share.malformedWhatsApp.push({ route, reason: "live claim", text: waText });
      if (/@/.test(waText)) share.malformedWhatsApp.push({ route, reason: "unverified handle", text: waText });
    }
    for (const anchor of xAnchors) {
      const href = decodeHtmlAttribute(anchorAttribute(anchor.tag, "href"));
      if (!href.startsWith("https://twitter.com/intent/tweet?text=")) {
        share.malformedX.push({ route, reason: "href prefix", href });
        continue;
      }
      checkShareAnchorChrome(route, "x", anchor.tag);
      let params;
      try {
        params = new URL(href).searchParams;
      } catch {
        share.malformedX.push({ route, reason: "unparseable", href });
        continue;
      }
      const tweetText = params.get("text") ?? "";
      const tweetUrl = params.get("url") ?? "";
      if (!tweetText.trim()) share.malformedX.push({ route, reason: "empty text", href });
      if (tweetUrl !== expected) share.malformedX.push({ route, reason: "canonical url mismatch", expected, got: tweetUrl });
      if (tweetText.includes(expected)) share.malformedX.push({ route, reason: "url duplicated in text", text: tweetText });
      if (/\blive\b/i.test(tweetText)) share.malformedX.push({ route, reason: "live claim", text: tweetText });
      if (/@/.test(tweetText)) share.malformedX.push({ route, reason: "unverified handle", text: tweetText });
      if (params.get("via") && !/^[A-Za-z0-9_]{1,15}$/.test(params.get("via"))) {
        share.malformedX.push({ route, reason: "malformed via", via: params.get("via") });
      }
    }
  }

  rows.push({
    environment: "local-static-export",
    route,
    httpStatus: 200,
    canonicalHost: canonical ? new URL(canonical, expectedOrigin).host : null,
    title,
    description,
    canonical,
    h1,
    noindex,
    jsonLdBlocks: ldScripts.length,
    internalLinks: hrefs.filter((h) => normalPath(h) !== null).length,
    externalSourceLinks: [...new Set(externalSourceLinks)],
    freshnessMarkers,
  });
}
const sitemapXml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemap = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapPaths = sitemap.map(normalPath).filter(Boolean);
const sitemapMissing = sitemapPaths.filter((p) => !routes.has(p));
const indexedNotInSitemap = rows.filter((r) => !r.noindex && r.route !== "/404" && !sitemapPaths.includes(r.route)).map((r) => r.route);
// A sitemap entry is wrong when it points at a page Google is told not to index or that is excluded from public serving.
const noindexInSitemap = rows.filter((r) => (r.noindex || r.route === "/404") && sitemapPaths.includes(r.route)).map((r) => r.route);
const groupedDuplicates = (key) => Object.values(rows.reduce((o, row) => { const v = row[key]; if (v) (o[v] ||= []).push(row.route); return o; }, {})).filter((x) => x.length > 1);

// robots.txt is the third leg of Google-readiness: prove it keeps public pages crawlable,
// keeps the Worker API and the admin stub out, and advertises exactly the committed canonical sitemap URL.
const robotsTxt = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
const disallowRules = robotsTxt
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /^Disallow:/i.test(line))
  .map((line) => line.replace(/^Disallow:\s*/i, ""))
  .filter(Boolean);
const robotsBlocksPath = (p) => disallowRules.some((d) => p.startsWith(d));
const robots = {
  allowsAll: /^Allow:\s*\/\s*$/im.test(robotsTxt),
  publicPagesReachable: !robotsBlocksPath("/prices") && !robotsBlocksPath("/sitemap.xml"),
  apiBlocked: robotsBlocksPath("/api/geo"),
  adminBlocked: robotsBlocksPath("/admin"),
  sitemapUrl: robotsTxt.match(/^Sitemap:\s*(\S+)\s*$/im)?.[1] ?? null,
};
const robotsOk =
  robots.allowsAll &&
  robots.publicPagesReachable &&
  robots.apiBlocked &&
  robots.adminBlocked &&
  robots.sitemapUrl === `${expectedOrigin}/sitemap.xml`;

// Public config is committed (config/site.ts, wrangler.jsonc), never dashboard-only, because dashboard values
// were dropped by builds before: the "Get alerts on Telegram" link silently disappeared. This guard fails the
// audit if a build does not render the committed Telegram channel URL on the two pages that show it.
// (`siteSource` is read from the same committed file above, next to the hero motion allowlist.)
const committedTelegramChannelUrl = siteSource.match(/TELEGRAM_CHANNEL_URL_DEFAULT\s*=\s*"([^"]*)"/)?.[1] ?? null;
const missingTelegramLink = committedTelegramChannelUrl
  ? ["/", "/status"].filter((route) => !routes.has(route) || !fs.readFileSync(routes.get(route), "utf8").includes(`href="${committedTelegramChannelUrl}"`))
  : [];
// The micro-bar is shared chrome, but the status dashboard and admin stub must not duplicate it.
// Check the actual static HTML, not just the React source (static export has no request-time render).
const htmlFor = (route) => routes.has(route) ? fs.readFileSync(routes.get(route), "utf8") : "";
const snapshotChrome = {
  missingOnPublicSample: ["/", "/prices/fuel", "/howto/drivers-licence-frsc"].filter((route) => !htmlFor(route).includes('aria-label="Saved FX and fuel readings"')),
  noisyOnStatusOrAdmin: ["/status", "/admin"].filter((route) => htmlFor(route).includes('aria-label="Saved FX and fuel readings"')),
  missingCheckedState: ["/", "/prices/fuel"].filter((route) => !/Recent at last check|Stale|Seeded, unverified|Unavailable/.test(htmlFor(route)) || !htmlFor(route).includes("Checked ")),
  missingWeeklyModule: !htmlFor("/").includes("Changed this week") ||
    !["No verified move this week", "Source moved from ", "Article updated "].some((text) => htmlFor("/").includes(text)),
};
const creditsFilePresent = fs.existsSync(path.join(process.cwd(), "docs", "image-credits.md"));

// Hero motion must be pure CSS behind a prefers-reduced-motion gate: the compiled stylesheets
// may only animate .article-hero-motion under `no-preference`, and `reduce` must kill both the
// animation and the transform. This is the "same page static when reduce-motion is ON" proof.
const collectMediaBlocks = (css, featureRe) => {
  const blocks = [];
  const re = /@media[^{]*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth += 1;
      else if (css[i] === "}") depth -= 1;
      i += 1;
    }
    if (featureRe.test(m[0])) blocks.push(css.slice(m.index, i));
  }
  return blocks;
};
const cssFiles = files.filter((f) => f.endsWith(".css"));
const cssText = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");
const reduceBlocks = collectMediaBlocks(cssText, /prefers-reduced-motion\s*:\s*reduce/i);
const noPrefBlocks = collectMediaBlocks(cssText, /prefers-reduced-motion\s*:\s*no-preference/i);
const outsideNoPref = noPrefBlocks.reduce((acc, b) => acc.split(b).join(""), cssText);
heroMotion.css = {
  files: cssFiles.length,
  hasMotionClassRule: cssText.includes("article-hero-motion"),
  animatesOnlyUnderNoPreference: !/\.article-hero-motion[^{]*\{[^}]*animation\s*:(?!\s*none\b)/s.test(outsideNoPref),
  driftLivesUnderNoPreference: noPrefBlocks.some((b) => /\.article-hero-motion[^{]*\{[^}]*animation\s*:/s.test(b)),
  reduceDisablesAnimation: reduceBlocks.some((b) => /\.article-hero-motion[^{]*\{[^}]*animation\s*:\s*none/i.test(b)),
  reduceDisablesTransform: reduceBlocks.some((b) => /\.article-hero-motion[^{]*\{[^}]*transform\s*:\s*none/i.test(b)),
};
const findings = {
  generatedHtmlRoutes: rows.length,
  sitemapUrls: sitemap.length,
  sitemapMissing,
  indexedNotInSitemap,
  noindexInSitemap,
  robots: { ...robots, ok: robotsOk },
  share: {
    pagesRequired: rows.filter((r) => !shareExcludedRoutes.has(r.route)).length,
    pagesWithWhatsApp: rows.filter((r) => !shareExcludedRoutes.has(r.route) && fs.readFileSync(routes.get(r.route), "utf8").includes("https://wa.me/?text=")).length,
    pagesWithX: rows.filter((r) => !shareExcludedRoutes.has(r.route) && fs.readFileSync(routes.get(r.route), "utf8").includes("https://twitter.com/intent/tweet?")).length,
    excludedRoutes: [...shareExcludedRoutes],
    ...share,
  },
  brokenInternalLinks: broken,
  brokenImageAssets,
  articleImages: {
    creditsFilePresent,
    howtoWithHeroCount: howtoWithHeroRoutes.length,
    howtoWithoutHeroCount: howtoWithoutHeroRoutes.length,
    sampleHowtoWithHero: howtoWithHeroRoutes[0] ?? null,
    sampleHowtoWithoutHero: howtoWithoutHeroRoutes[0] ?? null,
    pureDataPagesWithArticleImages,
    articleImagesMissingDimensionsOrAlt,
  },
  heroMotion,
  snapshotChrome,
  wrongCanonicalHost: rows.filter((r) => r.canonical && !r.canonical.startsWith(expectedOrigin)).map((r) => ({ route: r.route, canonical: r.canonical })),
  missing: {
    title: rows.filter((r) => !r.title).map((r) => r.route),
    description: rows.filter((r) => !r.description).map((r) => r.route),
    canonical: rows.filter((r) => !r.canonical && !r.noindex && r.route !== "/404").map((r) => r.route),
    h1: rows.filter((r) => !r.h1).map((r) => r.route),
  },
  duplicateTitles: groupedDuplicates("title"),
  duplicateDescriptions: groupedDuplicates("description"),
  invalidJsonLd: badJsonLd,
  committedTelegramChannelUrl,
  pagesMissingCommittedTelegramLink: missingTelegramLink,
  pages: rows,
};
const output = process.argv[2];
if (output) fs.writeFileSync(output, JSON.stringify(findings, null, 2) + "\n");
console.log(JSON.stringify({ ...findings, pages: undefined }, null, 2));
if (
  broken.length ||
  brokenImageAssets.length ||
  !creditsFilePresent ||
  !howtoWithHeroRoutes.length ||
  !howtoWithoutHeroRoutes.length ||
  pureDataPagesWithArticleImages.length ||
  articleImagesMissingDimensionsOrAlt.length ||
  sitemapMissing.length ||
  indexedNotInSitemap.length ||
  noindexInSitemap.length ||
  !robotsOk ||
  findings.wrongCanonicalHost.length ||
  badJsonLd.length ||
  missingTelegramLink.length ||
  share.pagesMissingWhatsApp.length ||
  share.pagesMissingX.length ||
  share.mismatchedSharePairs.length ||
  share.excludedRoutesWithShare.length ||
  share.malformedWhatsApp.length ||
  share.malformedX.length ||
  share.anchorMissingTargetRelOrLabel.length ||
  share.anchorBelow44px.length ||
  heroMotion.offAllowlistWithMotionClass.length ||
  heroMotion.forbiddenRoutesWithMotionClass.length ||
  heroMotion.allowlistedRoutesWithoutHero.length ||
  heroMotion.allowlistedHeroMissingMotionClass.length ||
  heroMotion.motionOnPagesWithoutHero.length ||
  heroMotion.motionClassOutsideHeroImg.length ||
  heroMotion.videoOrAudioTagsOnRoutes.length ||
  !heroMotion.css.hasMotionClassRule ||
  !heroMotion.css.animatesOnlyUnderNoPreference ||
  !heroMotion.css.driftLivesUnderNoPreference ||
  !heroMotion.css.reduceDisablesAnimation ||
  !heroMotion.css.reduceDisablesTransform ||
  snapshotChrome.missingOnPublicSample.length ||
  snapshotChrome.noisyOnStatusOrAdmin.length ||
  snapshotChrome.missingCheckedState.length ||
  snapshotChrome.missingWeeklyModule
)
  process.exitCode = 1;
