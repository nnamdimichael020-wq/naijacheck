"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";

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

/**
 * The site's single share component. Prefers the native share sheet
 * (`navigator.share`), then clipboard copy, plus an explicit WhatsApp button.
 * Only the public title, optional dated summary and canonical URL leave the page.
 */
export function ShareControls({ title, url, summary, placement = "footer" }: ShareControlsProps) {
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const text = summary ? `${title} — ${summary}` : title;

  /** Canonical URL on the site's configured origin (same source as metadata/`absUrl`). */
  const canonicalUrl = React.useCallback((): string => {
    if (url) return url;
    const path = typeof window === "undefined" ? "/" : window.location.pathname.replace(/\/+$/, "") || "/";
    return path === "/" ? `${SITE_CONFIG.url}/` : `${SITE_CONFIG.url}${path}`;
  }, [url]);

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
    const target = canonicalUrl();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: target });
        return;
      } catch (error) {
        // User closing the native sheet is not a failure; anything else falls back to copy.
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await copy(`${text} ${target}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  };

  const whatsapp = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text} ${canonicalUrl()}`)}`,
      "_blank",
      "noopener,noreferrer",
    );

  const inline = placement === "inline";
  return (
    <div
      aria-label="Share this page"
      className={
        inline
          ? "mt-4 flex flex-wrap items-center gap-2"
          : "mt-8 flex flex-wrap items-center gap-2 border-t pt-5"
      }
    >
      <Button type="button" variant="outline" size="sm" onClick={share} aria-label={`Share “${title}”`}>
        {copied ? <Check className="mr-2 size-4" aria-hidden="true" /> : <Share2 className="mr-2 size-4" aria-hidden="true" />}
        {copied ? "Copied" : "Share or copy"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={whatsapp} aria-label={`Share “${title}” on WhatsApp`}>
        WhatsApp
      </Button>
      <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {copied ? "Link copied." : inline ? null : "Only this public page title, date and link are shared."}
      </span>
      {copyFailed ? (
        <span role="alert" className="w-full text-xs text-destructive">
          Copy permission was unavailable. Use WhatsApp or copy the address from your browser.
        </span>
      ) : null}
    </div>
  );
}
