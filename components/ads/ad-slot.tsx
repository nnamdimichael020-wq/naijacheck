import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ADSENSE_CLIENT_ID } from "@/config/site";
import { SPONSOR_CARDS } from "@/lib/data";
import { AdsenseUnit } from "@/components/ads/adsense-unit";
import { cn } from "@/lib/utils";

export type AdVariant = "banner" | "in-content" | "sidebar" | "inline" | "footer";

const SIZE: Record<AdVariant, string> = {
  banner: "min-h-[90px] md:min-h-[100px]",
  "in-content": "min-h-[120px]",
  sidebar: "min-h-[250px]",
  inline: "min-h-[100px]",
  footer: "min-h-[90px]",
};

/**
 * One ad placement. Rules we follow:
 * - No pop-ups, interstitials, autoplay or sticky overlays. Ever.
 * - Every placement is labelled "Advertisement" or "Sponsored".
 * - With an AdSense client id set, Google serves the unit. Until then, an internal
 *   related-guide card is shown and is never described as a sponsorship.
 */
export function AdSlot({ variant, index = 0, className }: { variant: AdVariant; index?: number; className?: string }) {
  if (ADSENSE_CLIENT_ID) {
    return (
      <aside aria-label="Advertisement" className={cn("my-6 text-center", className)}>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Advertisement</p>
        <div className={cn("w-full", SIZE[variant])}>
          <AdsenseUnit />
        </div>
      </aside>
    );
  }

  const card = SPONSOR_CARDS[index % SPONSOR_CARDS.length];
  return (
    <aside
      aria-label="Related guide"
      className={cn(
        "my-6 rounded-lg border border-dashed bg-card/60 p-4",
        variant === "sidebar" && "p-5",
        variant === "footer" && "bg-transparent",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Related guide · Hustle idea
          </p>
          <p className="mt-1 font-semibold leading-snug">{card.title.replace("Related Hustle Idea: ", "")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{card.blurb}</p>

        </div>
      </div>
      <Link href={card.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        Read the blueprint <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </aside>
  );
}
