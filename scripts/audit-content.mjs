/**
 * Bot Type 4 Foundation: Read-only Content Audit Scanner.
 *
 * Scans built static HTML pages in ./out (and generated article metadata + official watch flags)
 * for outdated year references, stale verification dates, unguarded "live" labels on manual pages,
 * and official agency page-watch flags.
 *
 * Safety guarantees:
 *   1. Strictly READ-ONLY on app/, content/, data/, and out/ — NEVER auto-edits article bodies.
 *   2. Exits with code 0 by default even when review findings exist — NEVER fails production builds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CURRENT_YEAR = 2026;
const DEFAULT_MAX_MANUAL_AGE_DAYS = 45;

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pure scanner for a single page/article record. Exported so unit tests can verify detection rules
 * without touching the filesystem.
 */
export function scanArticleRecord({
  route,
  title = "",
  h1 = "",
  bodyText = "",
  section = "unknown",
  updatedAt = null,
  currentYear = DEFAULT_CURRENT_YEAR,
  nowMs = Date.now(),
  maxManualAgeDays = DEFAULT_MAX_MANUAL_AGE_DAYS,
}) {
  const findings = [];
  const headlineText = `${title} | ${h1}`;

  // 1. Outdated year pattern in title or H1 (e.g. "2024" or "2025" in a 2026 utility headline)
  const outdatedYearRe = new RegExp(`\\b(202[0-${Math.max(0, (currentYear % 10) - 1)}])\\b`, "g");
  const headlineYears = [...new Set([...headlineText.matchAll(outdatedYearRe)].map((m) => m[1]))];
  if (headlineYears.length > 0) {
    findings.push({
      route,
      category: "outdated-year-headline",
      severity: "review",
      detail: `Title or H1 references past year(s) ${headlineYears.join(", ")} (current utility year: ${currentYear}).`,
      excerpt: headlineText.slice(0, 180),
      recommendedAction: `Verify current ${currentYear} official policy/fees and update headline only after human verification.`,
    });
  }

  // 2. Outdated year coupled with fee / cut-off / registration claims in body text
  const bodyOutdatedFeeRe = new RegExp(
    `\\b(?:fee|cut-?off|registration|portal|tariff|schedule)\\b[^.?!]{0,45}\\b(202[0-${Math.max(0, (currentYear % 10) - 1)}])\\b`,
    "i",
  );
  const bodyYearMatch = bodyText.match(bodyOutdatedFeeRe);
  if (bodyYearMatch && headlineYears.length === 0) {
    findings.push({
      route,
      category: "outdated-year-body",
      severity: "review",
      detail: `Body text links a fee/cut-off/registration claim to past year ${bodyYearMatch[1]}.`,
      excerpt: bodyYearMatch[0].slice(0, 180),
      recommendedAction: `Check official agency portal for ${currentYear} updates before editing prose.`,
    });
  }

  // 3. Stale manual verification date (> maxManualAgeDays old)
  if (updatedAt) {
    const updatedMs = Date.parse(updatedAt);
    if (!Number.isNaN(updatedMs)) {
      const ageDays = Math.floor((nowMs - updatedMs) / 86_400_000);
      if (ageDays > maxManualAgeDays) {
        findings.push({
          route,
          category: "stale-verification-date",
          severity: "review",
          detail: `Article updatedAt (${updatedAt}) is ${ageDays} days old (threshold: ${maxManualAgeDays} days).`,
          excerpt: `updatedAt: ${updatedAt}`,
          recommendedAction: "Re-verify figures against named official/market sources and update last-verified date via PR.",
        });
      }
    }
  }

  // 4. Unguarded "live price / live rate" claim on manual/seeded sections
  const isManualSection =
    section.startsWith("prices") ||
    section === "howto" ||
    section === "exam" ||
    section === "telecom" ||
    section === "cookbook" ||
    section.startsWith("hustle");
  if (isManualSection) {
    const sentences = bodyText.split(/(?<=[.?!])\s+/);
    for (const sentence of sentences) {
      if (/\blive (?:market |pump |city |food |telecom |official )?(?:price|prices|rate|rates|fee|fees)\b/i.test(sentence)) {
        const isNegated = /\b(?:not|never|no|instead of|rather than|distinguish|separate from|unlike)\b/i.test(sentence);
        if (!isNegated) {
          findings.push({
            route,
            category: "live-label-risk",
            severity: "review",
            detail: `Manual/seeded section (${section}) contains an unnegated "live price/rate/fee" phrase.`,
            excerpt: sentence.slice(0, 180),
            recommendedAction: "Ensure seeded/manual/survey figures are labelled dated or indicative, never live.",
          });
          break;
        }
      }
    }
  }

  return findings;
}

/**
 * Scans official-page watcher state (data/live/watch.json) for changed fingerprints or read errors
 * that require human review of GovHowTo / Exam / FX pages.
 */
export function scanOfficialWatchState(watchJson) {
  const findings = [];
  const pages = watchJson?.pages ?? {};
  for (const [id, entry] of Object.entries(pages)) {
    if (entry?.changedSincePrevious || entry?.reviewRequired) {
      findings.push({
        route: `/status#watch-${id}`,
        category: "official-watch-changed",
        severity: "review",
        detail: `Official page fingerprint changed for ${entry.label || id} (${entry.url}).`,
        excerpt: entry.reviewReason || "Official public page wording changed since previous check.",
        recommendedAction: `Inspect ${entry.url} manually and verify whether any GovHowTo or Exam fee/rule needs a PR update.`,
      });
    }
  }
  return findings;
}

export function formatMarkdownReport(report) {
  const lines = [
    "# NaijaCheck Content Audit Report (Advisory / Read-Only)",
    "",
    `- **Scanned at:** ${report.scannedAt}`,
    `- **Current reference year:** ${report.currentYear}`,
    `- **Articles scanned:** ${report.articlesScanned}`,
    `- **Built HTML routes scanned:** ${report.htmlRoutesScanned}`,
    `- **Total review findings:** ${report.findings.length}`,
    "",
    "> **Safety note:** This audit is strictly read-only. It never auto-edits article bodies and never blocks production builds.",
    "",
  ];

  if (report.findings.length === 0) {
    lines.push("No outdated year patterns, stale verification dates, unguarded live-label claims, or changed official watch flags were detected.");
    return lines.join("\n") + "\n";
  }

  lines.push("| Route | Category | Detail | Recommended Human Action |");
  lines.push("|---|---|---|---|");
  for (const f of report.findings.slice(0, 50)) {
    const clean = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
    lines.push(`| \`${clean(f.route)}\` | \`${clean(f.category)}\` | ${clean(f.detail)} | ${clean(f.recommendedAction)} |`);
  }
  return lines.join("\n") + "\n";
}

export function runRepositoryContentAudit({
  rootDir = process.cwd(),
  currentYear = DEFAULT_CURRENT_YEAR,
  nowMs = Date.now(),
} = {}) {
  const findings = [];
  const articlesPath = path.join(rootDir, "content/generated/articles.json");
  const watchPath = path.join(rootDir, "data/live/watch.json");
  const outDir = path.join(rootDir, "out");

  let articlesScanned = 0;
  const scannedRoutes = new Set();

  if (fs.existsSync(articlesPath)) {
    const raw = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
    const articles = Array.isArray(raw) ? raw : raw.articles ?? [];
    for (const article of articles) {
      articlesScanned += 1;
      scannedRoutes.add(article.path);
      const bodyParts = [
        ...(article.intro ?? []),
        ...(article.takeaways ?? []),
        ...(article.steps ?? []),
        ...(article.sections ?? []).flatMap((s) => [s.h2, ...(s.paras ?? []), ...(s.bullets ?? [])]),
        ...(article.faqs ?? []).flatMap((f) => [f.q, f.a]),
      ];
      findings.push(
        ...scanArticleRecord({
          route: article.path,
          title: article.metaTitle || article.title,
          h1: article.title,
          bodyText: bodyParts.join(" "),
          section: article.section ?? "unknown",
          updatedAt: article.updatedAt ?? null,
          currentYear,
          nowMs,
        }),
      );
    }
  }

  let htmlRoutesScanned = 0;
  if (fs.existsSync(outDir)) {
    const walk = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
      );
    const htmlFiles = walk(outDir).filter((f) => f.endsWith(".html"));
    htmlRoutesScanned = htmlFiles.length;
    for (const file of htmlFiles) {
      const rel = path.relative(outDir, file).replaceAll(path.sep, "/");
      const route =
        rel === "index.html"
          ? "/"
          : rel.endsWith("/index.html")
            ? "/" + rel.slice(0, -"/index.html".length)
            : "/" + rel.slice(0, -5);
      if (scannedRoutes.has(route) || route === "/404") continue;
      const html = fs.readFileSync(file, "utf8");
      const title = stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
      const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
      const bodyText = stripTags(html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html);
      findings.push(
        ...scanArticleRecord({
          route,
          title,
          h1,
          bodyText,
          section: "static",
          updatedAt: null,
          currentYear,
          nowMs,
        }),
      );
    }
  }

  if (fs.existsSync(watchPath)) {
    try {
      const watchJson = JSON.parse(fs.readFileSync(watchPath, "utf8"));
      findings.push(...scanOfficialWatchState(watchJson));
    } catch {
      /* ignore malformed watch file in advisory scan */
    }
  }

  return {
    scannedAt: new Date(nowMs).toISOString(),
    currentYear,
    articlesScanned,
    htmlRoutesScanned,
    findingsCount: findings.length,
    findings,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf("--output");
  const outputPath = outIdx >= 0 ? args[outIdx + 1] : null;
  const mdIdx = args.indexOf("--markdown");
  const mdPath = mdIdx >= 0 ? args[mdIdx + 1] : null;

  const report = runRepositoryContentAudit();
  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
  }
  const markdown = formatMarkdownReport(report);
  if (mdPath) {
    fs.writeFileSync(mdPath, markdown);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  }
  console.log(
    JSON.stringify(
      {
        scannedAt: report.scannedAt,
        currentYear: report.currentYear,
        articlesScanned: report.articlesScanned,
        htmlRoutesScanned: report.htmlRoutesScanned,
        findingsCount: report.findingsCount,
        sampleFindings: report.findings.slice(0, 10),
      },
      null,
      2,
    ),
  );
  // Deliberately exits 0 so advisory content findings never fail production builds or deploys.
  process.exitCode = 0;
}
