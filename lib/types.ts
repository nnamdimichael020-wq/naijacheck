/** Shape of one entry in content/generated/articles.json (written by scripts/generate-content.ts). */
export type ArticleSection = { h2: string; paras: string[]; bullets?: string[] };
export type ArticleFaq = { q: string; a: string };
export type ArticleLink = { href: string; label: string };

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
};

export type SearchEntry = { path: string; title: string; kind: string; desc: string; keys: string };
