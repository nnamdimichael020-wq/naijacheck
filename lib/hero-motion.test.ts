/**
 * Hero motion policy tests — the subtle "Ken Burns" allowlist.
 *
 * Motion policy:
 *   1. Heroes are static by default; only the exact paths in `HERO_MOTION_ALLOWLIST`
 *      (config/site.ts) may carry the subtle CSS drift (`.article-hero-motion`).
 *   2. The drift is CSS-only, on the hero image only, honors
 *      `prefers-reduced-motion: reduce` (no animation, no transform), and never runs
 *      on /status, /tools/*, pure price tables, hustle-combo pages, or guides
 *      without a hero.
 *   3. No autoplay MP4/WebM loops and no sound — motion must not sit under the
 *      whole page body.
 *
 * Run with: `npm run hero:test`
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { HERO_MOTION_ALLOWLIST, heroMotionForPath, isHeroMotionForbiddenRoute } from "../config/site";
import { ARTICLE_IMAGE_CONFIG, resolveArticleHeroImage, validateArticleImageSafety } from "./article-images";
import type { Article, ArticleImage } from "./types";

/** Extracts top-level `@media (...) { ... }` blocks whose header matches `featureRe`. */
function cssMediaBlocks(css: string, featureRe: RegExp): string[] {
  const blocks: string[] = [];
  const re = /@media[^{]*\{/g;
  let m: RegExpExecArray | null;
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
}

const HERO_SHAPED: ArticleImage = {
  src: "/images/photos/lagos-tomato-seller.jpg",
  alt: "A woman selling tomatoes at a market stall in Lagos, Nigeria",
  width: 500,
  height: 625,
  sourceTier: "existing-photo",
  credit: "Photo: Pexels (photo/3890924) · Existing committed asset",
};

function run(): void {
  // ---- 1. Allowlist shape -----------------------------------------------
  assert.ok(HERO_MOTION_ALLOWLIST.length >= 3, "Motion policy allows 3-5 flagship routes");
  assert.ok(HERO_MOTION_ALLOWLIST.length <= 5, "Motion is capped at 5 flagship routes (never site-wide)");
  assert.equal(new Set(HERO_MOTION_ALLOWLIST).size, HERO_MOTION_ALLOWLIST.length, "Allowlist paths must be unique");
  for (const p of HERO_MOTION_ALLOWLIST) {
    assert.ok(p.startsWith("/"), `Allowlist entries must be exact route paths: ${p}`);
    assert.ok(!p.includes("?") && !p.includes("#"), `Allowlist entries must be bare paths: ${p}`);
    assert.ok(!isHeroMotionForbiddenRoute(p), `Allowlist must never contain a forbidden route: ${p}`);
    assert.equal(heroMotionForPath(p), "subtle", `Allowlisted route ${p} must resolve to motion "subtle"`);
  }

  // ---- 2. The flagship routes named in the motion policy -----------------
  for (const flagship of ["/", "/howto/drivers-licence-frsc", "/howto/prepaid-electricity-bands", "/howto/lasrra-lagos-residency"]) {
    assert.ok(
      (HERO_MOTION_ALLOWLIST as readonly string[]).includes(flagship),
      `Flagship route ${flagship} must be on the motion allowlist`,
    );
    assert.equal(heroMotionForPath(flagship), "subtle", `Flagship route ${flagship} must animate`);
  }

  // ---- 3. Everything else stays fully static ---------------------------
  for (const p of [
    "/status",
    "/status/anything",
    "/tools",
    "/tools/generator",
    "/tools/solar",
    "/tools/cookbook",
    "/tools/cookbook/jollof-rice",
    "/prices",
    "/prices/lagos",
    "/prices/lagos/rice",
    "/prices/fuel",
    "/prices/generator-diesel",
    "/prices/cost-of-living",
    "/prices/markets",
    "/prices/markets/some-market",
    "/hustle",
    "/hustle/pos-business",
    "/hustle/pos-business-with-200k-in-lagos",
    "/howto",
    "/howto/cac-business-name",
    "/howto/passport-renewal-2026",
    "/howto/some-new-guide",
    "/learn",
    "/learn/budget-80k",
    "/learn/electricity-bill-explained",
    "/trends/kelebu",
    "/exam/jamb-cutoff-unilag-2026",
    "/telecom/mtn",
    "/about",
    "/privacy",
    "/some/unknown/path",
  ]) {
    assert.equal(heroMotionForPath(p), "static", `Non-allowlisted route ${p} must stay motion "static"`);
  }

  // ---- 4. Forbidden route guard is independent of the allowlist ---------
  for (const p of [
    "/status",
    "/status/anything",
    "/tools",
    "/tools/generator",
    "/tools/cookbook/jollof-rice",
    "/prices",
    "/prices/lagos/rice",
    "/prices/markets/some-market",
    "/hustle",
    "/hustle/pos-business-with-200k-in-lagos",
  ]) {
    assert.equal(isHeroMotionForbiddenRoute(p), true, `Motion is policy-forbidden on ${p}`);
  }
  for (const p of ["/", "/howto/drivers-licence-frsc", "/howto/nbs-food-price-watch", "/learn/budget-80k", "/trends/kelebu"]) {
    assert.equal(isHeroMotionForbiddenRoute(p), false, `${p} is not a forbidden route shape`);
  }

  // ---- 5. Per-article image config can no longer override the allowlist --
  for (const [p, cfg] of Object.entries(ARTICLE_IMAGE_CONFIG)) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(cfg, "motion"),
      false,
      `ARTICLE_IMAGE_CONFIG[${p}] must not set motion — HERO_MOTION_ALLOWLIST in config/site.ts decides`,
    );
  }

  // ---- 6. The resolver stamps hero motion from the allowlist ------------
  const sectionFor = (p: string) => (p.startsWith("/learn/") ? "learn" : "howto");
  for (const [articlePath, cfg] of Object.entries(ARTICLE_IMAGE_CONFIG)) {
    const slug = articlePath.split("/").filter(Boolean).pop() ?? "guide";
    const hero = resolveArticleHeroImage({
      articlePath,
      slug,
      section: sectionFor(articlePath),
      shortTitle: "Test",
      kicker: "Test",
      existingPhotoKey: cfg.existingPhotoKey,
      licensedPhotoKey: cfg.licensedPhotoKey,
      photoAlt: cfg.photoAlt,
      photoCaption: cfg.photoCaption,
      enableHeroWhenNoPhoto: cfg.enableHeroWhenNoPhoto,
    });
    assert.ok(hero, `Configured route ${articlePath} must resolve a hero for this test`);
    assert.equal(
      hero.motion,
      heroMotionForPath(articlePath),
      `Hero motion on ${articlePath} must follow HERO_MOTION_ALLOWLIST (got "${hero.motion}")`,
    );
  }
  // The named flagship howtos animate; a hero-ful non-flagship howto stays static.
  const lasrra = resolveArticleHeroImage({
    articlePath: "/howto/lasrra-lagos-residency",
    slug: "lasrra-lagos-residency",
    section: "howto",
    shortTitle: "LASRRA",
    kicker: "GovHowTo",
    enableHeroWhenNoPhoto: true,
  });
  assert.equal(lasrra?.motion, "subtle", "LASRRA flagship hero must carry subtle motion");
  const cac = resolveArticleHeroImage({
    articlePath: "/howto/cac-business-name",
    slug: "cac-business-name",
    section: "howto",
    shortTitle: "CAC",
    kicker: "GovHowTo",
    enableHeroWhenNoPhoto: true,
  });
  assert.equal(cac?.motion, "static", "Non-allowlisted howto hero must stay static even with a hero image");

  // ---- 7. Safety validator enforces the allowlist -----------------------
  assert.equal(
    validateArticleImageSafety({ ...HERO_SHAPED, motion: "subtle" }, "/howto/cac-business-name").ok,
    false,
    "A non-allowlisted route must reject subtle hero motion",
  );
  assert.equal(
    validateArticleImageSafety({ ...HERO_SHAPED, motion: "static" }, "/howto/cac-business-name").ok,
    true,
    "A non-allowlisted route accepts a static hero",
  );
  assert.equal(
    validateArticleImageSafety({ ...HERO_SHAPED, motion: "subtle" }, "/howto/lasrra-lagos-residency").ok,
    true,
    "An allowlisted route accepts subtle hero motion",
  );
  assert.equal(
    validateArticleImageSafety({ ...HERO_SHAPED, motion: "static" }, "/howto/lasrra-lagos-residency").ok,
    false,
    "An allowlisted route hero must follow the allowlist (subtle), not silently stay static",
  );
  assert.equal(
    validateArticleImageSafety({ ...HERO_SHAPED, motion: "subtle" }, "/howto/lasrra-lagos-residency", "body").ok,
    false,
    "In-body images must never carry hero motion",
  );
  assert.equal(
    validateArticleImageSafety({ ...HERO_SHAPED }, "/howto/lasrra-lagos-residency", "body").ok,
    true,
    "A static in-body image passes",
  );

  // ---- 8. Generated articles.json is stamped consistently ---------------
  const rootDir = process.cwd();
  const articlesPath = path.join(rootDir, "content", "generated", "articles.json");
  assert.ok(fs.existsSync(articlesPath), "content/generated/articles.json must exist (run npm run generate)");
  const articles = JSON.parse(fs.readFileSync(articlesPath, "utf8")) as Article[];
  for (const a of articles) {
    if (a.heroImage) {
      assert.equal(
        a.heroImage.motion,
        heroMotionForPath(a.path),
        `Generated hero motion on ${a.path} must follow HERO_MOTION_ALLOWLIST`,
      );
    }
    if (a.bodyImage) {
      assert.ok(
        !a.bodyImage.motion || a.bodyImage.motion === "static",
        `In-body image on ${a.path} must stay static`,
      );
    }
  }
  // Exactly the flagship howtos animate in the generated content (home is app-level).
  const subtleArticles = articles
    .filter((a) => a.heroImage?.motion === "subtle")
    .map((a) => a.path)
    .sort();
  assert.deepEqual(
    subtleArticles,
    [
      "/howto/drivers-licence-frsc",
      "/howto/lasrra-lagos-residency",
      "/howto/nbs-food-price-watch",
      "/howto/prepaid-electricity-bands",
    ],
    "Exactly the four allowlisted howto flagships must animate in generated content",
  );

  // ---- 9. globals.css: drift only under no-preference; reduce kills it ---
  const css = fs.readFileSync(path.join(rootDir, "app", "globals.css"), "utf8");
  const reduceBlocks = cssMediaBlocks(css, /prefers-reduced-motion\s*:\s*reduce/);
  const noPrefBlocks = cssMediaBlocks(css, /prefers-reduced-motion\s*:\s*no-preference/);
  assert.ok(noPrefBlocks.length >= 1, "globals.css must gate the drift behind prefers-reduced-motion: no-preference");
  assert.ok(
    noPrefBlocks.some((b) => /\.article-hero-motion\s*\{[^}]*animation\s*:/s.test(b)),
    "The .article-hero-motion drift animation must live inside the no-preference gate",
  );
  assert.ok(
    reduceBlocks.some(
      (b) =>
        /\.article-hero-motion\s*\{[^}]*animation\s*:\s*none/i.test(b) &&
        /\.article-hero-motion\s*\{[^}]*transform\s*:\s*none/i.test(b),
    ),
    "prefers-reduced-motion: reduce must disable both animation and transform on .article-hero-motion",
  );
  const outsideNoPref = noPrefBlocks.reduce((acc, b) => acc.split(b).join(""), css);
  assert.ok(
    !/\.article-hero-motion\s*\{[^}]*animation\s*:(?!\s*none\b)/s.test(outsideNoPref),
    ".article-hero-motion must never animate outside the no-preference gate",
  );

  console.log(
    `Hero motion tests passed (${HERO_MOTION_ALLOWLIST.length} allowlisted flagship routes, ${articles.filter((a) => a.heroImage?.motion === "subtle").length} animated article heroes, reduce-motion kill switch verified).`,
  );
}

run();
