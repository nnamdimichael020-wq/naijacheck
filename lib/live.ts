/**
 * Typed access to the live snapshots written by scripts/monitor/run.ts (data/live/*.json).
 * Every value here carries its own timestamp and source, so the UI can show "as of" for each number.
 */
import fxLive from "@/data/live/fx.json";
import fuelLive from "@/data/live/fuel.json";
import feedsLive from "@/data/live/feeds.json";
import trendsLive from "@/data/live/trends.json";
import watchLive from "@/data/live/watch.json";
import healthLive from "@/data/live/health.json";
export { STATES, matchState } from "@/lib/states";

export type SourceRef = { label: string; url: string };

export type FeedItem = { title: string; link: string; source: string; published: string };
export type FeedTopic = { slug: string; label: string; query: string; items: FeedItem[] };

export type LiveTrendTerm = { slug: string; term: string; mentions7d: number; score: number };
export type LiveWiki = { article: string; views7d: number; prev7d: number; changePct: number | null };

export type LiveFx = {
  checkedAt: string;
  seeded?: boolean;
  official: { USD: number | null; GBP: number | null; EUR: number | null };
  officialAsOf: string | null;
  officialSource: SourceRef;
  blackMarket: { USD: { buy: number; sell: number }; GBP: { buy: number; sell: number } | null; EUR: { buy: number; sell: number } | null } | null;
  blackMarketAsOf: string | null;
  blackMarketSource: SourceRef;
};

export type LiveFuel = {
  checkedAt: string;
  seeded?: boolean;
  asOf: string | null;
  source: SourceRef;
  medians: { petrol: number | null; diesel: number | null; lpg: number | null };
  depots: { petrol: { depot: string; state: string; price: number }[]; diesel: { depot: string; state: string; price: number }[]; lpg: { depot: string; state: string; price: number }[] };
};

export type HealthRow = { ok: boolean; checkedAt: string; asOf?: string | null; error?: string };
export type WatchPage = { label: string; url: string; fingerprint?: string; lastChecked?: string; changedAt?: string | null; changedSincePrevious?: boolean; error?: string };

export const LIVE_FX = fxLive as unknown as LiveFx;
export const LIVE_FUEL = fuelLive as unknown as LiveFuel;
export const LIVE_FEEDS = feedsLive as unknown as { checkedAt: string | null; seeded?: boolean; topics: FeedTopic[] };
export const LIVE_TRENDS = trendsLive as unknown as {
  checkedAt: string | null;
  seeded?: boolean;
  method?: string;
  limitation?: string;
  terms: LiveTrendTerm[];
  wiki: LiveWiki[];
};
export const LIVE_WATCH = watchLive as unknown as { checkedAt: string | null; note?: string; pages: Record<string, WatchPage> };
export const LIVE_HEALTH = healthLive as unknown as Record<string, HealthRow>;

/** Newest headlines across every topic, de-duplicated by title. */
export function latestHeadlines(limit: number, topicSlug?: string): (FeedItem & { topic: string })[] {
  const seen = new Set<string>();
  return LIVE_FEEDS.topics
    .filter((t) => !topicSlug || t.slug === topicSlug)
    .flatMap((t) => t.items.map((i) => ({ ...i, topic: t.label })))
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    .filter((i) => {
      const key = i.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** Monitor status summary for the status page and footer. */
export function sourceHealth() {
  return Object.entries(LIVE_HEALTH).map(([key, row]) => ({ key, ...row }));
}
