import { heroMotionForPath } from "../config/site";
import type { ArticleBodyImage, ArticleImage, ImageSourceTier } from "./types";

/**
 * Pure data, calculator, hub, and status routes where article hero or in-body images
 * must NEVER be rendered.
 */
export const PURE_DATA_OR_TOOL_SECTIONS = new Set<string>([
  "prices",
  "prices-city",
  "prices-item",
  "prices-static",
  "cookbook",
  "tools",
  "hub",
  "hustle-combo",
]);

/**
 * Long-form article template sections where the content model supports at most one hero image
 * under the title and at most one optional in-body image when it adds understanding.
 */
export const ELIGIBLE_ARTICLE_IMAGE_SECTIONS = new Set<string>([
  "howto",
  "learn",
  "exam",
  "hustle-blueprint",
  "trends-slang",
  "trends-psych",
  "prices-market",
  "telecom",
]);

/** Numeric priority rank: lower number = higher priority when resolving a hero image. */
export const SOURCE_PRIORITY_ORDER: readonly ImageSourceTier[] = [
  "existing-photo",
  "licensed-photo",
  "branded-cover",
  "ai-fallback",
] as const;

export const FORBIDDEN_SCRAPE_PATTERNS: readonly RegExp[] = [
  /naijasabi/i,
  /nairaland/i,
  /legit\.ng/i,
  /punchng\.com/i,
  /vanguardngr\.com/i,
  /premiumtimesng\.com/i,
  /dailypost\.ng/i,
  /twitter\.com|x\.com|instagram\.com|facebook\.com|tiktok\.com/i,
  /\.gov\.ng\/.*\.pdf/i,
];

export type AiQualityGateChecks = {
  /** Prompt is specific to the article topic, grounded in Nigerian context, and editorial/documentary in tone. */
  nigerianEditorialContext: boolean;
  /** Neither prompt nor image depicts fake official documents, government seals, or readable ID numbers. */
  noFakeOfficialDocsOrSeals: boolean;
  /** True if inspection found melted/extra fingers, distorted hands, or warped facial features. */
  meltedHandsOrFaces: boolean;
  /** True if inspection found garbled text, misspelled packaging, or illegible signage/ledger writing. */
  garbledText: boolean;
  /** True if the image looks like generic non-Nigerian stock imagery. */
  genericNonNigerianStockLook: boolean;
  /** True if the image has plastic/glossy AI skin or heavy synthetic sheen. */
  heavyAiSheen: boolean;
  /** True if a watermark was added to mask or "fix" copyright. */
  watermarkCopyrightWorkaround?: boolean;
};

export type AiCandidateRecord = {
  id: string;
  articlePath: string;
  attempt: number;
  model: string;
  prompt: string;
  outputSrc?: string;
  width: number;
  height: number;
  bytes?: number;
  alt: string;
  caption?: string;
  credit: string;
  license: string;
  checks: AiQualityGateChecks;
  rejectionNote?: string;
};

export type QualityGateResult = {
  passed: boolean;
  rejectedReasons: string[];
};

/**
 * Evaluates an AI candidate image against NaijaCheck's pre-commit quality gate.
 * Any failure rejects the candidate and triggers automatic fallback to a generated branded cover.
 */
export function evaluateAiQualityGate(candidate: Pick<AiCandidateRecord, "prompt" | "checks" | "bytes">): QualityGateResult {
  const reasons: string[] = [];
  const { checks, prompt, bytes } = candidate;

  if (!prompt || prompt.trim().length < 30) {
    reasons.push("prompt-too-short-or-generic");
  }
  if (!/nigeria|lagos|aba|kano|onitsha|abuja|west african|ankara/i.test(prompt)) {
    reasons.push("missing-nigerian-context-in-prompt");
  }
  if (!checks.nigerianEditorialContext) {
    reasons.push("non-editorial-or-non-nigerian-context");
  }
  if (!checks.noFakeOfficialDocsOrSeals) {
    reasons.push("contains-fake-official-documents-seals-or-id-numbers");
  }
  if (checks.meltedHandsOrFaces) {
    reasons.push("melted-hands-or-faces");
  }
  if (checks.garbledText) {
    reasons.push("garbled-text");
  }
  if (checks.genericNonNigerianStockLook) {
    reasons.push("generic-non-nigerian-stock-look");
  }
  if (checks.heavyAiSheen) {
    reasons.push("heavy-ai-sheen");
  }
  if (checks.watermarkCopyrightWorkaround) {
    reasons.push("forbidden-watermark-copyright-workaround");
  }
  if (typeof bytes === "number" && bytes > 150_000) {
    reasons.push("exceeds-3g-file-size-budget");
  }

  return {
    passed: reasons.length === 0,
    rejectedReasons: reasons,
  };
}

/**
 * Checks whether a route/section is eligible for article hero or in-body images.
 * Pure data/tool pages and /status are strictly excluded.
 */
export function isArticleImageEligible(section: string, routePath: string): boolean {
  if (!routePath || routePath === "/status" || routePath === "/") return false;
  if (routePath.startsWith("/tools") || routePath === "/prices" || routePath === "/prices/fuel" || routePath === "/prices/generator-diesel" || routePath === "/prices/cost-of-living") {
    return false;
  }
  if (PURE_DATA_OR_TOOL_SECTIONS.has(section)) return false;
  return ELIGIBLE_ARTICLE_IMAGE_SECTIONS.has(section);
}

/**
 * Validates that an ArticleImage complies with safety, CLS, and anti-scraping rules.
 *
 * When `routePath` is provided, hero motion is also checked against the flagship
 * allowlist in `config/site.ts` ("subtle" only on `HERO_MOTION_ALLOWLIST` paths);
 * `kind: "body"` in-body images must never carry hero motion at all.
 */
export function validateArticleImageSafety(
  img: ArticleImage,
  routePath?: string,
  kind: "hero" | "body" = "hero",
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!img.src.startsWith("/images/")) {
    errors.push(`Image src must be a local committed path under /images/: received "${img.src}"`);
  }
  if (/^https?:\/\//i.test(img.src)) {
    errors.push(`External hotlinked or scraped URLs are forbidden: "${img.src}"`);
  }
  if (/\.(mp4|webm|mov|avi|mp3|wav|ogg)$/i.test(img.src)) {
    errors.push(`Video and audio files are forbidden in article images: "${img.src}"`);
  }
  for (const pattern of FORBIDDEN_SCRAPE_PATTERNS) {
    if (pattern.test(img.src) || pattern.test(img.credit) || (img.license && pattern.test(img.license))) {
      errors.push(`Forbidden scraped source matched pattern ${pattern}: "${img.src}"`);
    }
  }
  if (/watermark/i.test(img.credit) || (img.license && /watermark/i.test(img.license))) {
    errors.push(`Watermarks must never be used to "fix" copyright: "${img.src}"`);
  }
  if (!img.alt || img.alt.trim().length < 12) {
    errors.push(`Accessible alt text (>= 12 chars) is required: "${img.src}"`);
  }
  if (!Number.isInteger(img.width) || img.width <= 0 || !Number.isInteger(img.height) || img.height <= 0) {
    errors.push(`Intrinsic integer width and height must be reserved to prevent CLS: "${img.src}"`);
  }
  if (!img.credit || img.credit.trim().length === 0) {
    errors.push(`Credit/attribution line is required: "${img.src}"`);
  }

  // Hero motion is allowlist-driven (config/site.ts). In-body images stay static forever.
  const motion = img.motion ?? "static";
  if (kind === "body") {
    if (motion !== "static") {
      errors.push(`In-body images must never carry hero motion: "${img.src}" has motion "${motion}"`);
    }
  } else if (routePath) {
    const policyMotion = heroMotionForPath(routePath);
    if (motion !== policyMotion) {
      errors.push(
        `Hero motion must follow HERO_MOTION_ALLOWLIST in config/site.ts: ${routePath} expects "${policyMotion}" but image has "${motion}"`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Tier 1: Existing committed photos in public/images/photos/ with documented Pexels credits.
 */
export const EXISTING_COMMITTED_PHOTOS: Record<string, Omit<ArticleImage, "caption" | "motion">> = {
  "lagos-tomato-seller": {
    src: "/images/photos/lagos-tomato-seller.jpg",
    alt: "A woman selling fresh tomatoes at a market stall in Lagos, Nigeria",
    width: 500,
    height: 625,
    sourceTier: "existing-photo",
    credit: "Photo: Pexels (photo/3890924) · Existing committed asset",
    license: "Pexels License (free commercial use; documented in docs/image-credits.md)",
  },
  "lagos-danfo-bus": {
    src: "/images/photos/lagos-danfo-bus.jpg",
    alt: "Overhead view of a yellow danfo commuter bus on a paved Lagos street",
    width: 500,
    height: 667,
    sourceTier: "existing-photo",
    credit: "Photo: Pexels (photo/5409298) · Existing committed asset",
    license: "Pexels License (free commercial use; documented in docs/image-credits.md)",
  },
};

/**
 * Tier 2: Owner-added licensed photos (Pexels / Unsplash / owner photography) documented in docs/image-credits.md.
 * Kept as a typed map so owner-added photos automatically outrank branded covers and AI fallbacks.
 */
export const OWNER_LICENSED_PHOTOS: Record<string, Omit<ArticleImage, "caption" | "motion">> = {};

/**
 * Audit log of all AI fallback candidates evaluated during build/content preparation,
 * including both rejected candidates (which trigger fallback to branded cover) and accepted candidates.
 */
export const AI_CANDIDATE_LOG: readonly AiCandidateRecord[] = [
  {
    id: "cac-business-name-attempt-1",
    articlePath: "/howto/cac-business-name",
    attempt: 1,
    model: "Arena generate_image tool (platform image model)",
    prompt:
      "Editorial documentary photograph of a Nigerian small business owner in a bright neighbourhood provision and fabric shop in Lagos, Nigeria, writing inventory notes in a paper ledger beside a laptop on a wooden counter, shelves of colourful ankara fabrics and household goods softly in the background, natural afternoon daylight through the shop doorway, authentic West African documentary photojournalism style, 35mm lens, realistic skin texture, no text overlays, no signs, no official documents or seals.",
    width: 1408,
    height: 768,
    bytes: 272_273,
    alt: "Nigerian small business owner writing in a ledger beside a laptop in a neighbourhood shop",
    credit: "Rejected by NaijaCheck AI quality gate",
    license: "Rejected — not committed",
    checks: {
      nigerianEditorialContext: true,
      noFakeOfficialDocsOrSeals: false,
      meltedHandsOrFaces: false,
      garbledText: true,
      genericNonNigerianStockLook: false,
      heavyAiSheen: false,
    },
    rejectionNote:
      "Rejected before commit: background provision boxes had garbled AI text ('Detargeot', 'Jetergeat', 'IndorMie'), ledger had garbled writing, and counter showed a synthetic currency note.",
  },
  {
    id: "prepaid-electricity-bands-attempt-1",
    articlePath: "/howto/prepaid-electricity-bands",
    attempt: 1,
    model: "Arena generate_image tool (platform image model)",
    prompt:
      "Editorial documentary photograph of a Nigerian homeowner in Lagos checking a wall-mounted residential power changeover switch and electrical distribution box in a clean painted apartment hallway during daytime, warm natural window light, authentic Nigerian urban apartment interior, documentary photography style, 35mm lens, realistic hands, no readable text or serial numbers, no official seals.",
    width: 1408,
    height: 768,
    bytes: 170_568,
    alt: "Homeowner checking a wall-mounted changeover switch in a Lagos apartment hallway",
    credit: "Rejected by NaijaCheck AI quality gate",
    license: "Rejected — not committed",
    checks: {
      nigerianEditorialContext: true,
      noFakeOfficialDocsOrSeals: true,
      meltedHandsOrFaces: true,
      garbledText: true,
      genericNonNigerianStockLook: false,
      heavyAiSheen: false,
    },
    rejectionNote:
      "Rejected before commit: right hand touching switch had unnatural ring/knuckle artifacts across three adjacent fingers plus chalky white smudges, and breaker panel had garbled label text ('sydo').",
  },
  {
    id: "lasrra-lagos-residency-attempt-1",
    articlePath: "/howto/lasrra-lagos-residency",
    attempt: 1,
    model: "Arena generate_image tool (platform image model)",
    prompt:
      "Editorial documentary wide-angle photograph of residents walking along a tree-lined civic street in Ikeja, Lagos, Nigeria on a sunny morning, modern low-rise municipal building facade in the background with tropical trees, everyday Lagos commuters in ankara and smart casual attire, authentic Nigerian street photojournalism, natural daylight, 35mm film look, no text on buildings, no government seals or coats of arms, no readable signs.",
    width: 1376,
    height: 768,
    bytes: 373_545,
    alt: "Residents walking along a tree-lined street in Ikeja, Lagos",
    credit: "Rejected by NaijaCheck AI quality gate (fell back to branded cover)",
    license: "Rejected — not committed",
    checks: {
      nigerianEditorialContext: true,
      noFakeOfficialDocsOrSeals: true,
      meltedHandsOrFaces: true,
      garbledText: false,
      genericNonNigerianStockLook: false,
      heavyAiSheen: false,
    },
    rejectionNote:
      "Rejected before commit: distant pedestrians and okada rider in the wide street scene showed small-scale facial and hand distortion. Route fell back to Tier 3 generated branded cover.",
  },
  {
    id: "prepaid-electricity-bands-attempt-2",
    articlePath: "/howto/prepaid-electricity-bands",
    attempt: 2,
    model: "Arena generate_image tool (platform image model)",
    prompt:
      "Documentary architectural photograph of a modern Nigerian residential compound wall in Lagos during warm late-afternoon golden hour sunlight, showing a clean cream-painted stucco exterior wall with neat grey PVC electrical conduit pipes leading to a closed weatherproof grey metal electrical enclosure box under the roof eaves, lush green tropical compound foliage on one side, natural 50mm photojournalism lens, realistic matte surface textures, no people, no hands, no text, no numbers, no labels, no signs.",
    outputSrc: "/images/articles/howto-prepaid-electricity-bands.webp",
    width: 960,
    height: 540,
    bytes: 67_706,
    alt: "Exterior wall of a Nigerian residential compound in Lagos showing PVC electrical conduit pipes and a weatherproof meter enclosure box under the roof eaves",
    caption: "Residential service drop and meter enclosure on a Lagos compound wall. Your feeder band (A–E) and your DisCo's monthly NERC order determine what each kWh unit costs.",
    credit: "Illustration: NaijaCheck editorial AI fallback (quality-gated, WebP 66 KB)",
    license: "First-party generated editorial asset for NaijaCheck.ng; documented in docs/image-credits.md",
    checks: {
      nigerianEditorialContext: true,
      noFakeOfficialDocsOrSeals: true,
      meltedHandsOrFaces: false,
      garbledText: false,
      genericNonNigerianStockLook: false,
      heavyAiSheen: false,
    },
  },
  {
    id: "cac-business-name-attempt-2",
    articlePath: "/howto/cac-business-name",
    attempt: 2,
    model: "Arena generate_image tool (platform image model)",
    prompt:
      "Editorial documentary interior photograph of a contemporary Nigerian tailoring and textile workshop in Lagos, showing a warm solid wood workbench in the foreground with a closed silver laptop, brass fabric shears, and a coiled yellow tailor's measuring tape, with wooden shelves of vibrant folded West African ankara wax-print fabrics softly out of focus in the background, natural morning window light, 50mm documentary photography, matte natural colours, no people, no hands, no faces, no text, no papers, no documents, no logos.",
    outputSrc: "/images/articles/howto-cac-business-name.webp",
    width: 960,
    height: 540,
    bytes: 55_884,
    alt: "Wooden workbench inside a Nigerian tailoring and ankara fabric studio with a closed laptop, brass shears, measuring tape, and shelves of folded wax-print textiles",
    caption: "Small workshops and neighbourhood traders register a CAC Business Name (₦10,500 official portal fee in 2026) to open corporate bank accounts and invoice larger clients.",
    credit: "Illustration: NaijaCheck editorial AI fallback (quality-gated, WebP 55 KB)",
    license: "First-party generated editorial asset for NaijaCheck.ng; documented in docs/image-credits.md",
    checks: {
      nigerianEditorialContext: true,
      noFakeOfficialDocsOrSeals: true,
      meltedHandsOrFaces: false,
      garbledText: false,
      genericNonNigerianStockLook: false,
      heavyAiSheen: false,
    },
  },
];

export type HeroConfigInput = {
  articlePath: string;
  slug: string;
  section: string;
  shortTitle: string;
  kicker: string;
  /** Optional Tier 1 existing photo key (from EXISTING_COMMITTED_PHOTOS). */
  existingPhotoKey?: keyof typeof EXISTING_COMMITTED_PHOTOS;
  /** Optional Tier 2 owner-added licensed photo key (from OWNER_LICENSED_PHOTOS). */
  licensedPhotoKey?: keyof typeof OWNER_LICENSED_PHOTOS;
  /** Optional custom caption for Tier 1 / Tier 2 photo. */
  photoCaption?: string;
  /** Optional custom alt text more specific to the article when reusing a Tier 1 / Tier 2 photo. */
  photoAlt?: string;
  /**
   * Hero motion is NOT configurable per article. It is decided only by
   * `HERO_MOTION_ALLOWLIST` in `config/site.ts` via `heroMotionForPath()`.
   */
  /** Whether this article opts into a hero image when no Tier 1/2 photo exists. */
  enableHeroWhenNoPhoto?: boolean;
};

/**
 * Resolves the hero image for an article strictly following the 4-tier Source Priority:
 *   1) Existing committed public/images with credits (`existing-photo`)
 *   2) Owner-added licensed photos documented in docs/image-credits.md (`licensed-photo`)
 *   3) Generated branded cover (site green + logo + short title) when no photo (`branded-cover`)
 *   4) Optional AI-generated hero ONLY as fallback when no suitable photo exists (`ai-fallback`),
 *      automatically falling back to Tier 3 (`branded-cover`) if rejected by the quality gate.
 *
 * Returns `undefined` if the section/route is a pure data/tool page or if the article does not
 * opt into a hero image (supporting articles both with and without heroes).
 */
export function resolveArticleHeroImage(input: HeroConfigInput): ArticleImage | undefined {
  if (!isArticleImageEligible(input.section, input.articlePath)) {
    return undefined;
  }

  // Hero motion comes ONLY from the flagship allowlist in config/site.ts — never from
  // per-article content flags — so "everything else stays motion: static" by construction.
  const motion = heroMotionForPath(input.articlePath);

  // Priority 1: Existing committed public/images with credits
  if (input.existingPhotoKey && EXISTING_COMMITTED_PHOTOS[input.existingPhotoKey]) {
    const base = EXISTING_COMMITTED_PHOTOS[input.existingPhotoKey];
    return {
      ...base,
      alt: input.photoAlt ?? base.alt,
      caption: input.photoCaption,
      motion,
    };
  }

  // Priority 2: Owner-added licensed photos documented in docs/image-credits.md
  if (input.licensedPhotoKey && OWNER_LICENSED_PHOTOS[input.licensedPhotoKey]) {
    const base = OWNER_LICENSED_PHOTOS[input.licensedPhotoKey];
    return {
      ...base,
      alt: input.photoAlt ?? base.alt,
      caption: input.photoCaption,
      motion,
    };
  }

  // If the article does not request a fallback cover/hero when no photo exists, return undefined.
  if (!input.enableHeroWhenNoPhoto) {
    return undefined;
  }

  // Priority 4 (conditional): Optional AI-generated hero ONLY when no suitable photo exists
  // AND a candidate for this article passed the strict pre-commit quality gate.
  const candidates = AI_CANDIDATE_LOG.filter((c) => c.articlePath === input.articlePath);
  const acceptedAi = candidates.find((c) => evaluateAiQualityGate(c).passed && Boolean(c.outputSrc));

  if (acceptedAi && acceptedAi.outputSrc) {
    return {
      src: acceptedAi.outputSrc,
      alt: acceptedAi.alt,
      width: acceptedAi.width,
      height: acceptedAi.height,
      sourceTier: "ai-fallback",
      credit: acceptedAi.credit,
      license: acceptedAi.license,
      caption: acceptedAi.caption,
      motion,
    };
  }

  // Priority 3: Generated branded cover (site green + logo + short title) when no photo exists
  // or when AI candidate(s) were rejected by the quality gate.
  const hadRejectedAi = candidates.some((c) => !evaluateAiQualityGate(c).passed);
  return {
    src: `/images/covers/${input.slug}.svg`,
    alt: `${input.shortTitle} — NaijaCheck verified Nigerian reference cover`,
    width: 960,
    height: 540,
    sourceTier: "branded-cover",
    credit: hadRejectedAi
      ? "Cover: NaijaCheck branded cover (AI candidate rejected by quality gate)"
      : "Cover: NaijaCheck branded reference cover",
    license: "First-party SVG cover generated by NaijaCheck.ng (0-cost static asset)",
    caption: input.photoCaption,
    motion,
  };
}

/**
 * Curated hero & optional in-body image configuration for eligible long-form guides.
 *
 * Notice:
 * - Flagship /howto guides demonstrate all 4 tiers + quality-gate fallback AND an optional
 *   in-body diagram (max 1) where it genuinely adds understanding.
 * - Other /howto guides omit `heroImage` so the template is verified both with and without a hero.
 * - Pure data/tool pages and /status are never configured here and are blocked by `isArticleImageEligible`.
 * - Hero motion is deliberately NOT configurable here: it is decided only by
 *   `HERO_MOTION_ALLOWLIST` in `config/site.ts` (every other route stays `motion: "static"`).
 */
export const ARTICLE_IMAGE_CONFIG: Record<
  string,
  {
    existingPhotoKey?: keyof typeof EXISTING_COMMITTED_PHOTOS;
    licensedPhotoKey?: keyof typeof OWNER_LICENSED_PHOTOS;
    photoAlt?: string;
    photoCaption?: string;
    enableHeroWhenNoPhoto?: boolean;
    bodyImage?: ArticleBodyImage;
  }
> = {
  "/howto/nbs-food-price-watch": {
    existingPhotoKey: "lagos-tomato-seller",
    photoAlt: "A woman selling fresh tomatoes in bowls at a Lagos market stall, illustrating local volume measures versus per-kilogram NBS survey averages",
    photoCaption:
      "Open-market stalls sell tomatoes, grains and garri by bowl, paint bucket or bag — while the NBS Selected Food Price Watch reports monthly state averages per kilogram.",
    bodyImage: {
      src: "/images/diagrams/market-unit-conversion.svg",
      alt: "Three-step diagram showing how to weigh local market measures in kilograms and divide price paid by net weight before comparing with NBS state averages",
      width: 960,
      height: 540,
      sourceTier: "branded-cover",
      credit: "Diagram: NaijaCheck editorial reference",
      license: "First-party SVG instructional diagram; documented in docs/image-credits.md",
      caption: "Weigh the net contents in kilograms and divide the price paid by that weight before comparing with your state's NBS row.",
      afterSectionIndex: 3,
    },
  },
  "/howto/drivers-licence-frsc": {
    existingPhotoKey: "lagos-danfo-bus",
    photoAlt: "Overhead view of yellow commercial buses on a paved Lagos road, illustrating Nigerian road transport and driver licensing",
    photoCaption:
      "Every valid Nigerian driver's licence requires an online application, Remita card fee payment (₦15,000 for 3 years or ₦21,000 for 5 years as of 18 October 2026), BIR/MVAA confirmation, and physical biometric capture at an FRSC centre.",
  },
  "/howto/prepaid-electricity-bands": {
    enableHeroWhenNoPhoto: true,
    bodyImage: {
      src: "/images/diagrams/nerc-bands-and-receipt-check.svg",
      alt: "Diagram comparing NERC service bands A through E minimum daily supply hours, Eko DisCo September 2026 kWh units per 10,000 Naira, and the vending receipt rate formula",
      width: 960,
      height: 540,
      sourceTier: "branded-cover",
      credit: "Diagram: NaijaCheck editorial reference (NERC Sept 2026 orders)",
      license: "First-party SVG instructional diagram; documented in docs/image-credits.md",
      caption: "How Band A–E minimum supply hours compare with straight-line kWh units from ₦10,000 on Eko (EKEDP) September 2026 non-MD rates.",
      afterSectionIndex: 2,
    },
  },
  "/howto/cac-business-name": {
    enableHeroWhenNoPhoto: true,
  },
  "/howto/lasrra-lagos-residency": {
    enableHeroWhenNoPhoto: true,
    photoCaption:
      "LASRRA registration and your first LAG-ID card cost ₦0 at your local government or LCDA enrolment centre.",
  },
  "/howto/passport-renewal-2026": {
    enableHeroWhenNoPhoto: true,
    photoCaption:
      "Apply and pay only on the official Nigeria Immigration Service portal (immigration.gov.ng) — never pay cash to touts for 'fast track' processing.",
  },
  "/learn/budget-80k": {
    existingPhotoKey: "lagos-tomato-seller",
    photoAlt: "A trader selling fresh produce at a Lagos market stall, representing weekly household food budgeting in Lagos",
    photoCaption:
      "Buying core staples in bulk and separating fixed transport and power costs on day one are the main ways Lagos workers stretch a tight monthly budget.",
  },
  "/learn/electricity-bill-explained": {
    enableHeroWhenNoPhoto: true,
    photoCaption:
      "Compare kWh units consumed rather than naira spent each month to spot estimated-billing jumps or tariff band changes.",
  },
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Wraps a title into at most 3 balanced lines of ~34 characters for the 960x540 branded SVG cover. */
export function wrapCoverTitle(title: string, maxCharsPerLine = 34): string[] {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === 2) break;
    }
  }
  const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const remainingWords = words.slice(consumedWords);
  if (remainingWords.length > 0) {
    let lastLine = remainingWords.join(" ");
    if (lastLine.length > maxCharsPerLine + 6) {
      lastLine = lastLine.slice(0, maxCharsPerLine + 3).trimEnd() + "…";
    }
    lines.push(lastLine);
  }
  return lines.slice(0, 3);
}

/**
 * Generates a deterministic, lightweight (960x540, 16:9) branded cover SVG using
 * NaijaCheck's site green (#008751), official logo mark, category kicker, and short title.
 */
export function buildBrandedCoverSvg(opts: {
  shortTitle: string;
  kicker: string;
  verifiedLabel?: string;
}): string {
  const lines = wrapCoverTitle(opts.shortTitle, 34);
  const kickerText = escapeXml(opts.kicker.toUpperCase());
  const footerRight = escapeXml(opts.verifiedLabel ?? "Verified Reference Guide");
  const baseY = lines.length === 1 ? 280 : lines.length === 2 ? 255 : 232;

  const titleTspans = lines
    .map(
      (line, idx) =>
        `<text x="72" y="${baseY + idx * 54}" fill="#ffffff" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="42" font-weight="800" letter-spacing="-0.6">${escapeXml(line)}</text>`,
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540" role="img" aria-label="${escapeXml(opts.shortTitle)} — NaijaCheck branded cover">
  <defs>
    <linearGradient id="ncCoverGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#005a36"/>
      <stop offset="55%" stop-color="#008751"/>
      <stop offset="100%" stop-color="#063b25"/>
    </linearGradient>
    <pattern id="ncGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="960" height="540" fill="url(#ncCoverGrad)"/>
  <rect width="960" height="540" fill="url(#ncGrid)"/>

  <!-- Decorative accent shapes -->
  <circle cx="880" cy="90" r="180" fill="#f5b700" fill-opacity="0.10"/>
  <circle cx="850" cy="460" r="220" fill="#000000" fill-opacity="0.16"/>

  <!-- Card frame -->
  <rect x="40" y="36" width="880" height="468" rx="22" fill="#06291a" fill-opacity="0.58" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.5"/>

  <!-- Brand header with NaijaCheck logo mark -->
  <g transform="translate(72, 68)">
    <rect width="52" height="52" rx="13" fill="#008751" stroke="#ffffff" stroke-opacity="0.25" stroke-width="1.5"/>
    <path d="M13 37.4V14.6h4.9l16.2 16.2V14.6H39v22.8h-4.9L17.9 21.2v16.2z" fill="#ffffff"/>
    <path d="M35.8 11.4l2.4 4.9 4.9.8-3.7 3.5.8 5-4.4-2.4-4.5 2.4.8-5-3.7-3.5 4.9-.8z" fill="#f5b700"/>
    <text x="68" y="25" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800">NaijaCheck.ng</text>
    <text x="68" y="45" fill="#b7e4ce" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">${kickerText}</text>
  </g>

  <!-- Gold accent bar -->
  <rect x="72" y="152" width="88" height="6" rx="3" fill="#f5b700"/>

  <!-- Short title -->
  ${titleTspans}

  <!-- Footer bar -->
  <line x1="72" y1="432" x2="888" y2="432" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/>
  <text x="72" y="466" fill="#d3f2e2" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="600">Real Prices · Official Portals · Source-Labelled Guides</text>
  <rect x="650" y="444" width="238" height="32" rx="16" fill="#008751" stroke="#f5b700" stroke-opacity="0.6" stroke-width="1"/>
  <text x="769" y="465" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="12.5" font-weight="700" text-anchor="middle">${footerRight}</text>
</svg>
`;
}
