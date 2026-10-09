import fs from "node:fs";
import path from "node:path";

const root = path.resolve("out");
const expectedOrigin = "https://naijacheck.nnamdimichael020.workers.dev";
if (!fs.existsSync(root)) throw new Error("out/ is missing; run npm run build first");

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = walk(root);
const htmlFiles = files.filter((f) => f.endsWith(".html"));
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
const badJsonLd = [];
for (const [route, file] of routes) {
  const html = fs.readFileSync(file, "utf8");
  const title = text(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = attr(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || attr(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i) || attr(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  const h1 = text(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"'#]+)(?:#[^"']*)?["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    const p = normalPath(href);
    if (p === null || p.startsWith("/api/")) continue;
    const exists = routes.has(p) || assetPaths.has(p) || assetPaths.has(`${p}.html`) || assetPaths.has(`${p}/index.html`);
    if (!exists) broken.push({ from: route, href: p });
  }
  const ldScripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of ldScripts) try { JSON.parse(raw); } catch (e) { badJsonLd.push({ route, error: e.message }); }
  rows.push({ route, title, description, canonical, h1, noindex, jsonLdBlocks: ldScripts.length, internalLinks: hrefs.filter((h) => normalPath(h) !== null).length });
}
const sitemapXml = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemap = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapPaths = sitemap.map(normalPath).filter(Boolean);
const sitemapMissing = sitemapPaths.filter((p) => !routes.has(p));
const indexedNotInSitemap = rows.filter((r) => !r.noindex && r.route !== "/404" && !sitemapPaths.includes(r.route)).map((r) => r.route);
const groupedDuplicates = (key) => Object.values(rows.reduce((o, row) => { const v = row[key]; if (v) (o[v] ||= []).push(row.route); return o; }, {})).filter((x) => x.length > 1);
const findings = {
  generatedHtmlRoutes: rows.length,
  sitemapUrls: sitemap.length,
  sitemapMissing,
  indexedNotInSitemap,
  brokenInternalLinks: broken,
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
  pages: rows,
};
const output = process.argv[2];
if (output) fs.writeFileSync(output, JSON.stringify(findings, null, 2) + "\n");
console.log(JSON.stringify({ ...findings, pages: undefined }, null, 2));
if (broken.length || sitemapMissing.length || findings.wrongCanonicalHost.length || badJsonLd.length) process.exitCode = 1;
