import articlesFile from "@/content/generated/articles.json";
import type { Article } from "@/lib/types";

/** All generated long-form pages. Built at compile time, so no runtime fetching. */
export const ARTICLES = articlesFile as unknown as Article[];

const BY_PATH = new Map(ARTICLES.map((a) => [a.path, a]));

/** Throws at build time if a route asks for an article the generator did not create. */
export function getArticle(path: string): Article {
  const a = BY_PATH.get(path);
  if (!a) throw new Error(`Missing generated article for ${path}. Run npm run generate.`);
  return a;
}

/**
 * Params for a one-segment dynamic route under `prefix`, e.g. prefix "/trends" gives
 * { slug: "kelebu" } for "/trends/kelebu". Nested paths are excluded.
 */
export function staticSlugs(prefix: string): { slug: string }[] {
  return ARTICLES.filter((a) => a.path.startsWith(`${prefix}/`) && !a.path.slice(prefix.length + 1).includes("/")).map((a) => ({
    slug: a.path.slice(prefix.length + 1),
  }));
}

export const SITE_PAGE_COUNT = ARTICLES.length;
