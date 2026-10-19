/** Shape of one entry in content/generated/articles.json (written by scripts/generate-content.ts). */

/** A small comparison table rendered inside an article section. Cells are plain strings. */
export type ArticleTable = { caption?: string; columns: string[]; rows: string[][] };

export type ArticleSection = { h2: string; paras: string[]; bullets?: string[]; table?: ArticleTable };
export type ArticleFaq = { q: string; a: string };
export type ArticleLink = { href: string; label: string };

export type VerificationState = "live" | "recent" | "stale" | "seeded" | "manual" | "unavailable";

export type ImageSourceTier = "existing-photo" | "licensed-photo" | "branded-cover" | "ai-fallback";

export type ArticleImage = {
  /** Public asset path starting with /images/... */
  src: string;
  /** Descriptive accessible alt text (required for every accepted image). */
  alt: string;
  /** Intrinsic pixel width reserved before load to prevent CLS. */
  width: number;
  /** Intrinsic pixel height reserved before load to prevent CLS. */
  height: number;
  /** Source priority tier (1: existing-photo, 2: licensed-photo, 3: branded-cover, 4: ai-fallback). */
  sourceTier: ImageSourceTier;
  /** Visible credit / attribution line shown under the image. */
  credit: string;
  /** License or usage note documented in docs/image-credits.md. */
  license?: string;
  /** Short editorial caption that adds context for the reader. */
  caption?: string;
  /**
   * Hero-only motion, stamped from `HERO_MOTION_ALLOWLIST` in `config/site.ts`
   * (`"subtle"` only on allowlisted flagship routes, `"static"` everywhere else).
   * Rendered as pure CSS that honors `prefers-reduced-motion: reduce`.
   */
  motion?: "static" | "subtle";
};

export type ArticleBodyImage = ArticleImage & {
  /** 0-based section index after which this in-body image renders. */
  afterSectionIndex: number;
};

export type Article = {
  path: string;
  section: string;
  navLabel: string;
  kicker: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  params: Record<string, string>;
  intro: string[];
  sections: ArticleSection[];
  faqs: ArticleFaq[];
  takeaways: string[];
  steps?: string[];
  links: ArticleLink[];
  wordCount: number;
  updatedAt: string;
  schemaType: "Article" | "HowTo";
  /** Date a human last verified the figures against the named official source (ISO yyyy-mm-dd). */
  lastVerified?: string;
  /** Honest verification state for the figures on this page. Never upgraded to `live` for statutory data. */
  verification?: VerificationState;
  /** Short sentence naming the source and how the figures were checked. */
  sourceNote?: string;
  /** Outbound links to the official portals a reader should use before paying. */
  officialLinks?: ArticleLink[];
  /** Line items a human could not verify from an official page and must confirm before paying. */
  unverifiedItems?: string[];
  /** True when the source is a free public release, so the copy must not talk about paying for it. */
  freeRelease?: boolean;
  /** Optional hero image rendered under the title on eligible howto / long-form article templates. */
  heroImage?: ArticleImage;
  /** Optional single in-body image (at most 1 per article) when it adds understanding; skipped on data/tool pages. */
  bodyImage?: ArticleBodyImage;
};

export type SearchEntry = { path: string; title: string; kind: string; desc: string; keys: string };
