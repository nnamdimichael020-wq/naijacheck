/**
 * Headline card rules.
 *
 * A headline card shows a third-party feed item exactly as the feed published it. We never rewrite
 * the title, never fetch or store the article body, and never turn a headline into a NaijaCheck
 * article. The only thing NaijaCheck adds is *navigation*: a named source, an honest WAT timestamp,
 * a "Read original" link to the publisher, and — only when a headline clearly touches a dataset or
 * guide we already publish — one short context line pointing at our own page.
 *
 * The context rules live here as a tiny, testable table:
 *   - at most one context line per headline,
 *   - no context line at all when nothing matches (silence beats filler),
 *   - every href is an internal route that `npm run audit:static` also checks.
 *
 * Deliberately NOT here: any summariser, any paraphrase of the article, any outbound fetch.
 */

import { formatWatFull } from "./utils";

/** The only two fields a context rule may look at. The article body is not an input, ever. */
export type HeadlineContextInput = {
  title: string;
  topic?: string | null;
};

export type HeadlineInput = HeadlineContextInput & {
  link: string;
  source?: string | null;
  published?: string | null;
};

export type HeadlineContext = {
  /** Rule id, useful in tests and debugging. */
  id: string;
  /** Internal route (`/status`, `/prices/fuel`, …). Never an external URL. */
  href: string;
  /** One short line shown under the headline. Kept to what our own page actually shows. */
  label: string;
};

export type HeadlineContextRule = {
  id: string;
  href: string;
  label: string;
  pattern: RegExp;
};

/**
 * Context rules, in priority order. First match wins.
 *
 * Wording rule: the label may only promise what our own page really shows. `/status` shows the
 * monitored parallel quote next to the CBN NFEM closing rate *with their verification states*, so
 * the line says "Compare", not "live". A stale or unavailable reading must never be advertised as
 * live by copy on a headline card.
 */
export const HEADLINE_CONTEXT_RULES: readonly HeadlineContextRule[] = [
  {
    id: "fx",
    href: "/status",
    label: "Compare parallel vs CBN on /status",
    pattern:
      /\b(?:dollar|dollars|usd|naira|ngn|forex|fx|cbn|exchange rate|exchange rates|black market|parallel market|devaluation|aboki)\b/i,
  },
  {
    id: "fuel",
    href: "/prices/fuel",
    label: "See depot medians on /prices/fuel",
    pattern:
      /\b(?:petrol|pms|diesel|ago|dpk|depot|depots|gantry|fuel|pump price|pump prices|filling station|tankers?|nnpc|nmdpra|subsidy)\b/i,
  },
  {
    id: "licence",
    href: "/howto/drivers-licence-frsc",
    label: "Step-by-step on /howto/drivers-licence-frsc",
    pattern:
      /\b(?:driver'?s? licen[cs]es?|driving licen[cs]es?|frsc|dssp|vios?|learner'?s? permits?|drivers?\s?licen[cs]e)\b/i,
  },
  {
    id: "passport",
    href: "/howto/passport-renewal-2026",
    label: "Step-by-step on /howto/passport-renewal-2026",
    pattern: /\b(?:passports?|immigration|e-?passports?|international passports?)\b/i,
  },
  {
    id: "nin",
    href: "/howto/nin-correction",
    label: "Step-by-step on /howto/nin-correction",
    pattern: /\b(?:nin|nimc|national identification number|national identity number)\b/i,
  },
];

export const HEADLINE_TIME_UNAVAILABLE = "Time not stated by the feed";
export const HEADLINE_SOURCE_UNAVAILABLE = "Publisher not stated";
export const HEADLINE_LINK_UNAVAILABLE = "No publisher link in this feed read";

/** Parses a feed timestamp. Returns null for missing, blank or unparseable values. */
export function headlineTimeMs(published?: string | null): number | null {
  if (!published) return null;
  const ms = Date.parse(published);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Absolute WAT label plus the ISO value for `<time dateTime>`. When the feed gives no usable
 * timestamp we say so instead of printing "Invalid Date" or guessing "today".
 */
export function headlineTime(published?: string | null): { label: string; iso: string | null } {
  const ms = headlineTimeMs(published);
  if (ms === null) return { label: HEADLINE_TIME_UNAVAILABLE, iso: null };
  return { label: formatWatFull(ms), iso: new Date(ms).toISOString() };
}

/** The named publisher for the card. Never blank, never invented. */
export function headlineSource(source?: string | null): string {
  const trimmed = (source ?? "").trim();
  return trimmed.length > 0 ? trimmed : HEADLINE_SOURCE_UNAVAILABLE;
}

/** Only http(s) publisher links are rendered as an outbound action. */
export function isExternalHeadlineLink(link?: string | null): boolean {
  if (!link) return false;
  try {
    const url = new URL(link);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Host shown next to the outbound action so the reader knows where the link goes. */
export function headlineLinkHost(link?: string | null): string | null {
  if (!isExternalHeadlineLink(link)) return null;
  const host = new URL(link as string).hostname.replace(/^www\./, "");
  return host || null;
}

export function headlineIsGoogleNews(link?: string | null): boolean {
  const host = headlineLinkHost(link);
  return host !== null && (host === "news.google.com" || host.endsWith(".news.google.com"));
}

/**
 * The single context line for a headline, or null when no rule matches.
 * Matching runs against the feed title and the NaijaCheck topic label only — never the article body,
 * because we do not have one and will not fetch one.
 */
export function headlineContext(item: HeadlineContextInput): HeadlineContext | null {
  const haystack = `${item.title ?? ""} ${item.topic ?? ""}`.trim();
  if (!haystack) return null;
  for (const rule of HEADLINE_CONTEXT_RULES) {
    if (rule.pattern.test(haystack)) {
      return { id: rule.id, href: rule.href, label: rule.label };
    }
  }
  return null;
}

export type HeadlineCardModel = {
  title: string;
  source: string;
  time: { label: string; iso: string | null };
  /** Publisher link, or null when the feed item has no usable url. */
  externalLink: string | null;
  linkHost: string | null;
  viaGoogleNews: boolean;
  topic: string | null;
  context: HeadlineContext | null;
};

/** One pure projection used by the server component, so the card markup stays dumb. */
export function headlineCardModel(item: HeadlineInput): HeadlineCardModel {
  return {
    title: (item.title ?? "").trim(),
    source: headlineSource(item.source),
    time: headlineTime(item.published),
    externalLink: isExternalHeadlineLink(item.link) ? item.link : null,
    linkHost: headlineLinkHost(item.link),
    viaGoogleNews: headlineIsGoogleNews(item.link),
    topic: (item.topic ?? "").trim() || null,
    context: headlineContext(item),
  };
}
