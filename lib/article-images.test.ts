/**
 * Article image policy, source priority, quality gate, and placement guard tests.
 *
 * Run with: `npm run images:test`
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AI_CANDIDATE_LOG,
  SOURCE_PRIORITY_ORDER,
  buildBrandedCoverSvg,
  evaluateAiQualityGate,
  isArticleImageEligible,
  resolveArticleHeroImage,
  validateArticleImageSafety,
} from "./article-images";
import type { Article } from "./types";

function run(): void {
  // 1. Source priority order matches specification
  assert.deepEqual(
    SOURCE_PRIORITY_ORDER,
    ["existing-photo", "licensed-photo", "branded-cover", "ai-fallback"],
    "Source priority order must be existing-photo -> licensed-photo -> branded-cover -> ai-fallback",
  );

  // 2. Pure data/tool pages and /status are strictly excluded
  for (const [section, route] of [
    ["static", "/status"],
    ["hub", "/prices"],
    ["prices-city", "/prices/lagos"],
    ["prices-item", "/prices/lagos/rice"],
    ["prices-static", "/prices/fuel"],
    ["prices-static", "/prices/generator-diesel"],
    ["prices-static", "/prices/cost-of-living"],
    ["hub", "/tools"],
    ["tools", "/tools/generator"],
    ["tools", "/tools/solar"],
    ["cookbook", "/tools/cookbook/jollof-rice"],
    ["hustle-combo", "/hustle/pos-business-with-200k-in-lagos"],
  ] as const) {
    assert.equal(
      isArticleImageEligible(section, route),
      false,
      `Pure data/tool/status route ${route} (${section}) must not be eligible for article images`,
    );
    const resolved = resolveArticleHeroImage({
      articlePath: route,
      slug: "test",
      section,
      shortTitle: "Test",
      kicker: "Test",
      existingPhotoKey: "lagos-tomato-seller",
      enableHeroWhenNoPhoto: true,
    });
    assert.equal(resolved, undefined, `resolveArticleHeroImage must return undefined for ineligible route ${route}`);
  }

  // 3. Tier 1 (existing committed photo) outranks AI fallback and branded cover
  const tier1Hero = resolveArticleHeroImage({
    articlePath: "/howto/prepaid-electricity-bands",
    slug: "prepaid-electricity-bands",
    section: "howto",
    shortTitle: "Prepaid Electricity Bands",
    kicker: "GovHowTo · Power",
    existingPhotoKey: "lagos-tomato-seller",
    enableHeroWhenNoPhoto: true,
  });
  assert.ok(tier1Hero, "Tier 1 hero should resolve");
  assert.equal(tier1Hero.sourceTier, "existing-photo", "Tier 1 existing-photo must take priority over AI fallback");
  assert.equal(tier1Hero.src, "/images/photos/lagos-tomato-seller.jpg");

  // 4. AI candidate log: 3 rejected, 2 accepted; rejected LASRRA candidate falls back to Tier 3 branded cover
  const evaluated = AI_CANDIDATE_LOG.map((c) => ({ candidate: c, gate: evaluateAiQualityGate(c) }));
  const rejected = evaluated.filter((x) => !x.gate.passed);
  const accepted = evaluated.filter((x) => x.gate.passed);
  assert.equal(rejected.length, 3, "Exactly 3 AI candidate images should be recorded as rejected by the quality gate");
  assert.equal(accepted.length, 2, "Exactly 2 AI candidate images should pass the quality gate");

  const lasrraHero = resolveArticleHeroImage({
    articlePath: "/howto/lasrra-lagos-residency",
    slug: "lasrra-lagos-residency",
    section: "howto",
    shortTitle: "LASRRA / LAG-ID Lagos Residency",
    kicker: "GovHowTo · Identity and residency",
    enableHeroWhenNoPhoto: true,
  });
  assert.ok(lasrraHero, "LASRRA hero should resolve after AI rejection");
  assert.equal(
    lasrraHero.sourceTier,
    "branded-cover",
    "When AI candidate is rejected by the quality gate, resolver must fall back to branded-cover",
  );
  assert.equal(lasrraHero.src, "/images/covers/lasrra-lagos-residency.svg");

  // 5. Quality gate unit checks for every individual rejection reason
  assert.equal(
    evaluateAiQualityGate({
      prompt: "Editorial documentary photo in Lagos, Nigeria of a market stall",
      checks: {
        nigerianEditorialContext: true,
        noFakeOfficialDocsOrSeals: true,
        meltedHandsOrFaces: true,
        garbledText: false,
        genericNonNigerianStockLook: false,
        heavyAiSheen: false,
      },
    }).passed,
    false,
    "Quality gate must reject melted hands or faces",
  );
  assert.equal(
    evaluateAiQualityGate({
      prompt: "Editorial documentary photo in Lagos, Nigeria of a market stall",
      checks: {
        nigerianEditorialContext: true,
        noFakeOfficialDocsOrSeals: true,
        meltedHandsOrFaces: false,
        garbledText: true,
        genericNonNigerianStockLook: false,
        heavyAiSheen: false,
      },
    }).passed,
    false,
    "Quality gate must reject garbled text",
  );
  assert.equal(
    evaluateAiQualityGate({
      prompt: "Editorial documentary photo in Lagos, Nigeria of an official document",
      checks: {
        nigerianEditorialContext: true,
        noFakeOfficialDocsOrSeals: false,
        meltedHandsOrFaces: false,
        garbledText: false,
        genericNonNigerianStockLook: false,
        heavyAiSheen: false,
      },
    }).passed,
    false,
    "Quality gate must reject fake official documents, seals, or readable ID numbers",
  );
  assert.equal(
    evaluateAiQualityGate({
      prompt: "Editorial documentary photo in Lagos, Nigeria of an office",
      checks: {
        nigerianEditorialContext: true,
        noFakeOfficialDocsOrSeals: true,
        meltedHandsOrFaces: false,
        garbledText: false,
        genericNonNigerianStockLook: true,
        heavyAiSheen: false,
      },
    }).passed,
    false,
    "Quality gate must reject generic non-Nigerian stock look",
  );
  assert.equal(
    evaluateAiQualityGate({
      prompt: "Editorial documentary photo in Lagos, Nigeria of a workshop",
      checks: {
        nigerianEditorialContext: true,
        noFakeOfficialDocsOrSeals: true,
        meltedHandsOrFaces: false,
        garbledText: false,
        genericNonNigerianStockLook: false,
        heavyAiSheen: true,
      },
    }).passed,
    false,
    "Quality gate must reject heavy AI sheen",
  );

  // 6. Safety validator blocks scraped sources, watermarks, hotlinks, and video backgrounds
  assert.equal(
    validateArticleImageSafety({
      src: "https://naijasabi.com/scraped.jpg",
      alt: "Scraped image from external site",
      width: 960,
      height: 540,
      sourceTier: "existing-photo",
      credit: "naijasabi",
    }).ok,
    false,
    "Safety validator must block scraped naijasabi/external URLs",
  );
  assert.equal(
    validateArticleImageSafety({
      src: "/images/articles/Watermark-Fixed.jpg",
      alt: "Image with watermark added to fix copyright",
      width: 960,
      height: 540,
      sourceTier: "licensed-photo",
      credit: "Added watermark to fix copyright",
    }).ok,
    false,
    "Safety validator must block watermark copyright workarounds",
  );
  assert.equal(
    validateArticleImageSafety({
      src: "/images/articles/hero-video.mp4",
      alt: "Autoplay video background on article",
      width: 960,
      height: 540,
      sourceTier: "existing-photo",
      credit: "NaijaCheck",
    }).ok,
    false,
    "Safety validator must block video files",
  );

  // 7. Branded cover SVG generator outputs valid 960x540 SVG with site green (#008751), logo, and title
  const sampleSvg = buildBrandedCoverSvg({
    shortTitle: "Nigerian International Passport Renewal",
    kicker: "GovHowTo · Travel documents",
    verifiedLabel: "Updated 9 October 2026",
  });
  assert.ok(sampleSvg.includes('viewBox="0 0 960 540"'), "Branded cover SVG must reserve 960x540 viewBox");
  assert.ok(sampleSvg.includes("#008751"), "Branded cover SVG must use NaijaCheck site green #008751");
  assert.ok(sampleSvg.includes("NaijaCheck.ng"), "Branded cover SVG must include NaijaCheck brand mark");
  assert.ok(sampleSvg.includes("Passport Renewal"), "Branded cover SVG must render the short title");

  // 8. Verify generated articles.json and docs/image-credits.md on disk
  const rootDir = process.cwd();
  const creditsPath = path.join(rootDir, "docs", "image-credits.md");
  assert.ok(fs.existsSync(creditsPath), "docs/image-credits.md must exist");
  const creditsContent = fs.readFileSync(creditsPath, "utf8");

  const articlesPath = path.join(rootDir, "content", "generated", "articles.json");
  const articles = JSON.parse(fs.readFileSync(articlesPath, "utf8")) as Article[];

  const howtoArticles = articles.filter((a) => a.section === "howto");
  const howtoWithHero = howtoArticles.filter((a) => Boolean(a.heroImage));
  const howtoWithoutHero = howtoArticles.filter((a) => !a.heroImage);

  assert.ok(howtoWithHero.length >= 1, "At least one /howto/* guide must have a hero image");
  assert.ok(howtoWithoutHero.length >= 1, "At least one /howto/* guide must be rendered without a hero image");

  for (const article of articles) {
    if (!isArticleImageEligible(article.section, article.path)) {
      assert.equal(article.heroImage, undefined, `Pure data/tool/hub page ${article.path} must not have heroImage`);
      assert.equal(article.bodyImage, undefined, `Pure data/tool/hub page ${article.path} must not have bodyImage`);
    }
    for (const img of [article.heroImage, article.bodyImage].filter(Boolean)) {
      if (!img) continue;
      const kind = img === article.heroImage ? "hero" : "body";
      const safety = validateArticleImageSafety(img, article.path, kind);
      assert.ok(safety.ok, `Article ${article.path} image failed safety check: ${safety.errors.join("; ")}`);
      const diskPath = path.join(rootDir, "public", img.src.replace(/^\//, ""));
      assert.ok(fs.existsSync(diskPath), `Image asset ${img.src} referenced by ${article.path} must exist at ${diskPath}`);
      assert.ok(
        creditsContent.includes(img.src),
        `Every article image (${img.src} on ${article.path}) must be documented in docs/image-credits.md`,
      );
    }
  }

  console.log(
    `Article image tests passed (${howtoWithHero.length} howto guides with hero, ${howtoWithoutHero.length} howto guides without hero, ${rejected.length} AI candidates rejected by gate, ${accepted.length} accepted, 0 data/tool page images).`,
  );
}

run();
