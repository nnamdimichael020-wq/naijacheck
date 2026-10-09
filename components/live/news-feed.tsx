import { ExternalLink } from "lucide-react";
import { latestHeadlines } from "@/lib/live";
import { Freshness } from "@/components/live/freshness";
import { Badge } from "@/components/ui/badge";
import { LIVE_FEEDS } from "@/lib/live";

const WAT = new Intl.DateTimeFormat("en-NG", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Newest headlines from the monitored topics. Each one links to the original publisher. */
export function LiveNewsFeed({ limit = 8, topic }: { limit?: number; topic?: string }) {
  const items = latestHeadlines(limit, topic);
  return (
    <section aria-labelledby="live-news" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="live-news" className="text-xl font-bold tracking-tight">
          Monitored headlines
        </h2>
        <Freshness asOf={LIVE_FEEDS.checkedAt} label="Checked" />
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          The first headline check has not run yet. It runs every three hours.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((i) => (
            <li key={i.link + i.title} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <a href={i.link} target="_blank" rel="noopener noreferrer nofollow" className="font-medium leading-snug hover:text-primary">
                  {i.title}
                  <ExternalLink className="ml-1 inline size-3 align-[-1px] opacity-60" aria-hidden="true" />
                </a>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {i.source || "Publisher"} · {WAT.format(new Date(i.published))} WAT
                </p>
              </div>
              <Badge variant="outline" className="w-fit shrink-0">
                {i.topic}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
