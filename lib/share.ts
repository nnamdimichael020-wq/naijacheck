/**
 * Share intent rules for NaijaCheck.
 *
 * One place decides what leaves the page when a reader taps WhatsApp or X:
 *   - the public page title,
 *   - one short, dated factual line when the page has one,
 *   - the canonical (or public site) URL.
 *
 * Nothing else. No calculator inputs, hustle drafts, location, watch rules or
 * push values are accepted by these functions, and no analytics is attached.
 *
 * The X intent deliberately omits any @mention unless a real, validated handle
 * is configured in `config/site.ts` (`SITE_CONFIG.xHandle`). Today that value is
 * empty, so the prefill stays neutral instead of pointing at an unverified account.
 */
import type { Article } from "./types";
import { SITE_CONFIG } from "../config/site";

export type ShareTarget = {
  /** Public page title — never private form inputs. */
  title: string;
  /** One short, dated factual line (e.g. "indicative prices dated 9 October 2026"). */
  summary?: string;
  /** Canonical public URL for the page. */
  url: string;
};

/** X counts 23 characters for every URL; leave generous room inside the 280 limit. */
export const MAX_X_TEXT_LENGTH = 200;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Collapse whitespace so a prefill is always one readable line. */
export function cleanShareText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** `2026-10-09` (or an ISO timestamp) becomes `9 October 2026`; anything else is returned cleaned. */
export function formatShareDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return cleanShareText(value);
  const day = Number(match[3]);
  const month = MONTHS[Number(match[2]) - 1];
  if (!month || day < 1 || day > 31) return cleanShareText(value);
  return `${day} ${month} ${match[1]}`;
}

/** `Title — factual line` or just the title when no line is available. */
export function shareText(target: Pick<ShareTarget, "title" | "summary">): string {
  const title = cleanShareText(target.title) || SITE_CONFIG.name;
  const summary = cleanShareText(target.summary ?? "");
  return summary ? `${title} — ${summary}` : title;
}

/** Clamp without cutting a word, so X never receives a broken sentence. */
export function clampShareText(value: string, max: number = MAX_X_TEXT_LENGTH): string {
  if (max <= 1 || value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const body = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${body}…`;
}

/**
 * Only the site's own public https origin may be shared. A preview host,
 * localhost, a non-https URL or any other domain falls back to the configured
 * canonical homepage so a bad call site can never leak a private origin.
 */
export function publicShareUrl(value: string | undefined): string {
  const site = new URL(SITE_CONFIG.url);
  const fallback = `${site.origin}/`;
  if (!value) return fallback;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.origin !== site.origin) return fallback;
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${site.origin}${path || "/"}`;
  } catch {
    return fallback;
  }
}

/** X handles are 1–15 letters, digits or underscores; a leading @ is optional in input. */
export function normalizeXHandle(value: string | null | undefined): string | null {
  const handle = (value ?? "").trim().replace(/^@+/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : null;
}

/**
 * WhatsApp needs the URL inside `text` because wa.me has no separate url parameter.
 * The public URL is always appended once, after the title and factual line.
 */
export function whatsappShareUrl(target: ShareTarget): string {
  const url = publicShareUrl(target.url);
  const text = `${clampShareText(shareText(target))} ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * X intent prefills `text` and passes the canonical page separately in `url`.
 * `via` is added only when a real, valid handle is configured; otherwise no @
 * appears anywhere in the prefill.
 */
export function xShareUrl(target: ShareTarget, handle: string | null = SITE_CONFIG.xHandle): string {
  const params = new URLSearchParams();
  params.set("text", clampShareText(shareText(target)));
  params.set("url", publicShareUrl(target.url));
  const via = normalizeXHandle(handle);
  if (via) params.set("via", via);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** Both explicit network links, always rendered (mobile and desktop). */
export function shareLinks(target: ShareTarget): { whatsapp: string; x: string } {
  return { whatsapp: whatsappShareUrl(target), x: xShareUrl(target) };
}

/**
 * Short factual line for a generated article. Every branch says what the page
 * is and when it was dated/checked; none claims a value is live, and no number
 * is invented here.
 */
export function articleShareSummary(
  article: Pick<Article, "section" | "updatedAt" | "lastVerified">,
): string {
  const date = formatShareDate(article.lastVerified ?? article.updatedAt);
  const { section } = article;
  if (section === "howto") {
    return article.lastVerified
      ? `fee and steps checked against official sources, ${date}`
      : `fee and steps guide dated ${date}`;
  }
  if (section.startsWith("prices")) return `indicative prices dated ${date}`;
  switch (section) {
    case "cookbook":
      return `recipe costs dated ${date}`;
    case "exam":
      return `cut-offs and fees dated ${date}`;
    case "telecom":
      return `bundle prices dated ${date}`;
    case "trends-slang":
    case "trends-psych":
      return `meaning and context dated ${date}`;
    case "hustle-blueprint":
    case "hustle-combo":
      return `planning estimates dated ${date}`;
    case "tools":
      return `calculator updated ${date}`;
    case "learn":
      return `guide dated ${date}`;
    case "hub":
      return `dated guides and tools, ${date}`;
    default:
      return `dated ${date}`;
  }
}
