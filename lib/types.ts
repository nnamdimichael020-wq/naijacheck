/** Shape of one entry in content/generated/articles.json (written by scripts/generate-content.ts). */

/** A small comparison table rendered inside an article section. Cells are plain strings. */
export type ArticleTable = { caption?: string; columns: string[]; rows: string[][] };

export type ArticleSection = { h2: string; paras: string[]; bullets?: string[]; table?: ArticleTable };
export type ArticleFaq = { q: string; a: string };
export type ArticleLink = { href: string; label: string };

export type VerificationState = "live" | "recent" | "stale" | "seeded" | "manual" | "unavailable";

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
};

export type SearchEntry = { path: string; title: string; kind: string; desc: string; keys: string };
