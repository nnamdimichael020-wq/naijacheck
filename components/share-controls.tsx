"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { publicShareUrl, shareLinks, shareText } from "@/lib/share";

type ShareControlsProps = {
  /** Public page title — never private form inputs. */
  title: string;
  /** Canonical public URL for this page. Defaults to the configured canonical origin + current path. */
  url?: string;
  /** Optional short dated line (e.g. "as of 9 October 2026") for pages that show a rate or price. */
  summary?: string;
  /** "inline" sits right under the page title; "footer" is the secondary end-of-page placement. */
  placement?: "inline" | "footer";
};

/** Brand glyphs drawn in currentColor so they stay readable in light and dark themes. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} fill="currentColor">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

/**
 * The site's single share component.
 *
 * - Prefers the native share sheet (`navigator.share`), then clipboard copy.
 * - Always renders explicit WhatsApp and X links (44px targets, works with or
 *   without JavaScript, on mobile and desktop).
 * - Only the public title, optional dated summary and canonical URL leave the page.
 */
export function ShareControls({ title, url, summary, placement = "footer" }: ShareControlsProps) {
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const pathname = usePathname();
  const text = shareText({ title, summary });

  /** Canonical URL on the site's configured origin (same source as metadata/`absUrl`). */
  const canonicalUrl = React.useMemo(() => {
    if (url) return publicShareUrl(url);
    const path = (pathname ?? "/").replace(/\/+$/, "");
    return publicShareUrl(path && path !== "/" ? `${SITE_CONFIG.url}${path}` : `${SITE_CONFIG.url}/`);
  }, [url, pathname]);

  const links = React.useMemo(
    () => shareLinks({ title, summary, url: canonicalUrl }),
    [title, summary, canonicalUrl],
  );

  const copy = async (value: string) => {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("Clipboard unavailable");
  };

  const share = async () => {
    setCopyFailed(false);
    setCopied(false);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: canonicalUrl });
        return;
      } catch (error) {
        // User closing the native sheet is not a failure; anything else falls back to copy.
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await copy(`${text} ${canonicalUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  };

  const inline = placement === "inline";
  return (
    <div
      role="group"
      aria-label="Share this page"
      className={
        inline
          ? "mt-4 flex flex-wrap items-center gap-2"
          : "mt-8 flex flex-wrap items-center gap-2 border-t pt-5"
      }
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 min-w-11"
        onClick={share}
        aria-label={copied ? "Link copied" : `Share or copy: “${title}”`}
      >
        {copied ? <Check className="mr-2 size-4" aria-hidden="true" /> : <Share2 className="mr-2 size-4" aria-hidden="true" />}
        {copied ? "Copied" : "Share or copy"}
      </Button>
      <Button asChild variant="outline" size="sm" className="min-h-11 min-w-11">
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          data-share-target="whatsapp"
          aria-label={`Share on WhatsApp: “${title}” (opens in a new tab)`}
        >
          <WhatsAppIcon className="size-4 text-[#128C7E] dark:text-[#25D366]" />
          WhatsApp
        </a>
      </Button>
      <Button asChild variant="outline" size="sm" className="min-h-11 min-w-11">
        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          data-share-target="x"
          aria-label={`Post on X: “${title}” (opens in a new tab)`}
        >
          <XIcon className="size-4" />
          Post on X
        </a>
      </Button>
      <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {copied ? "Link copied." : inline ? null : "Only this public page title, date and link are shared."}
      </span>
      {copyFailed ? (
        <span role="alert" className="w-full text-xs text-destructive">
          Copy permission was unavailable. Use WhatsApp or X, or copy the address from your browser.
        </span>
      ) : null}
    </div>
  );
}
