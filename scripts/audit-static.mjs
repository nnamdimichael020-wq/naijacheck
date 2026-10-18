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
const articleImagesMissingDimensionsOrAlt = [];
const pureDataPagesWithArticleImages = [];
const howtoWithHeroRoutes = [];
const howtoWithoutHeroRoutes = [];
const badJsonLd = [];
const pureDataRouteRe = /^(\/status|\/prices(?:\/|$)|\/tools(?:\/|$))/;
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
const siteSource = fs.readFileSync(path.join(process.cwd(), "config", "site.ts"), "utf8");
const committedTelegramChannelUrl = siteSource.match(/TELEGRAM_CHANNEL_URL_DEFAULT\s*=\s*"([^"]*)"/)?.[1] ?? null;
const missingTelegramLink = committedTelegramChannelUrl
  ? ["/", "/status"].filter((route) => !routes.has(route) || !fs.readFileSync(routes.get(route), "utf8").includes(`href="${committedTelegramChannelUrl}"`))
  : [];
const creditsFilePresent = fs.existsSync(path.join(process.cwd(), "docs", "image-credits.md"));
const findings = {
  generatedHtmlRoutes: rows.length,
  sitemapUrls: sitemap.length,
  sitemapMissing,
  indexedNotInSitemap,
  noindexInSitemap,
  robots: { ...robots, ok: robotsOk },
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
  missingTelegramLink.length
)
  process.exitCode = 1;
