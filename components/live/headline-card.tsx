import Link from "next/link";
import { ArrowRight, ExternalLink, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  HEADLINE_LINK_UNAVAILABLE,
  headlineCardModel,
  type HeadlineInput,
} from "@/lib/headlines";
import { cn } from "@/lib/utils";

/**
 * One monitored headline, rendered identically everywhere it appears (homepage briefing and the
 * monitored-headlines list).
 *
 * What this card is:
 *   - the feed's own title, unedited;
 *   - the named publisher, the WAT timestamp we actually received, and the verification state of
 *     the headline dataset shown by the parent section;
 *   - one "Read original" action that opens the publisher's page in a new tab;
 *   - at most one short internal context line, and only when `lib/headlines.ts` has a rule for it.
 *
 * What this card is not:
 *   - no article body, no scrape, no NaijaCheck re-write, no /news/... route.
 *
 * Markup notes: the whole card is tappable through a stretched overlay on the one real anchor
 * (`.after:absolute.after:inset-0`), so there is a single link in the accessibility tree named
 * "Read original <title>". The optional context link sits above that overlay (`relative z-10`) and
 * remains a separate, reachable internal link. Everything is in normal document flow, so it cannot
 * fight the bottom navigation or the push-permission sheet.
 */
export type HeadlineCardProps = {
  item: HeadlineInput;
  /** Unique prefix so two lists on one page never emit duplicate element ids. */
  idPrefix: string;
  /** Position in the list, used for the heading's element id. */
  index: number;
  /** Show the NaijaCheck topic label (Fuel, Dollar and naira, …). */
  showTopic?: boolean;
  className?: string;
};

export function HeadlineCard({ item, idPrefix, index, showTopic = true, className }: HeadlineCardProps) {
  const model = headlineCardModel(item);
  const titleId = `${idPrefix}-headline-${index}`;

  return (
    <li className={cn("list-none", className)}>
      <article
        aria-labelledby={titleId}
        className="relative flex h-full flex-col gap-2 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/60"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <h3 id={titleId} className="min-w-0 text-sm font-semibold leading-snug text-foreground sm:text-[15px]">
            {model.title}
          </h3>
          {showTopic && model.topic ? (
            <Badge variant="outline" className="w-fit shrink-0 text-[10px]">
              {model.topic}
            </Badge>
          ) : null}
        </div>

        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/85">Source: {model.source}</span>
          <span aria-hidden="true">·</span>
          {model.time.iso ? (
            <time dateTime={model.time.iso}>{model.time.label}</time>
          ) : (
            <span>{model.time.label}</span>
          )}
        </p>

        {model.context ? (
          <p className="text-[11px]">
            <Link
              href={model.context.href}
              className="relative z-10 inline-flex min-h-6 items-center gap-1 font-semibold text-primary underline-offset-2 hover:underline"
            >
              {model.context.label}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-2">
          {model.externalLink ? (
            <>
              <a
                href={model.externalLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-bold text-primary transition-colors after:absolute after:inset-0 after:content-[''] hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Read original
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only">: {model.title} (opens in a new tab)</span>
              </a>
              <span className="text-[10px] text-muted-foreground">
                {model.viaGoogleNews ? "Publisher page, via Google News RSS" : model.linkHost ?? "External publisher"} ·
                new tab
              </span>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">{HEADLINE_LINK_UNAVAILABLE}</p>
          )}
        </div>
      </article>
    </li>
  );
}

/** Renders a list of headlines with consistent semantics and spacing. */
export function HeadlineList({
  items,
  idPrefix,
  showTopic = true,
  className,
}: {
  items: HeadlineInput[];
  idPrefix: string;
  showTopic?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("grid list-none gap-2.5", className)}>
      {items.map((item, index) => (
        <HeadlineCard
          key={`${item.link}-${item.title}`}
          item={item}
          idPrefix={idPrefix}
          index={index}
          showTopic={showTopic}
        />
      ))}
    </ul>
  );
}

/** Section-level honesty note: the titles are the feed's, and we never store the article body. */
export function HeadlineSourceNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-[11px] text-muted-foreground", className)}>
      <Newspaper className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
      <span>
        Titles are shown exactly as the feed published them. NaijaCheck stores no article text and publishes no
        rewritten news page — &ldquo;Read original&rdquo; opens the publisher&rsquo;s own page in a new tab.
      </span>
    </p>
  );
}
