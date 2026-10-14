import { LIVE_FEEDS, latestHeadlines } from "@/lib/live";
import { Freshness } from "@/components/live/freshness";
import { HeadlineList, HeadlineSourceNote } from "@/components/live/headline-card";
import { DATASET_REGISTRY } from "@/lib/source-registry";

/**
 * Monitored headlines from our Google News RSS topic reads.
 *
 * Each card keeps the feed's own title, names the publisher and the WAT time we received, and sends
 * the reader to the publisher for the actual story. NaijaCheck stores no article body and creates no
 * news article page from these items — the optional context line only points at our own dataset or
 * guide when a headline clearly touches one.
 */
export function LiveNewsFeed({ limit = 8, topic }: { limit?: number; topic?: string }) {
  const items = latestHeadlines(limit, topic);
  const headlinesRecord = DATASET_REGISTRY.find((d) => d.id === "headlines");
  return (
    <section aria-labelledby="live-news" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="live-news" className="text-xl font-bold tracking-tight">
          Monitored headlines
        </h2>
        <Freshness asOf={LIVE_FEEDS.checkedAt} label="Checked" state={headlinesRecord?.state} />
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          The first headline check has not run yet. It runs every three hours.
        </p>
      ) : (
        <>
          <HeadlineList items={items} idPrefix="monitored" />
          <HeadlineSourceNote />
        </>
      )}
    </section>
  );
}
