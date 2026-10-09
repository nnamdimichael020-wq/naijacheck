"use client";

import * as React from "react";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareControls({ title, updatedAt }: { title: string; updatedAt?: string }) {
  const [copied, setCopied] = React.useState(false);
  const [copyFailed, setCopyFailed] = React.useState(false);
  const text = `${title}${updatedAt ? ` — updated ${updatedAt}` : ""}`;
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
    const payload = { title, text, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(payload); return; } catch (error) { if ((error as DOMException).name === "AbortError") return; }
    }
    try {
      await copy(`${text} ${window.location.href}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${window.location.href}`)}`, "_blank", "noopener,noreferrer");
  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 border-t pt-5" aria-label="Share this page">
      <Button type="button" variant="outline" size="sm" onClick={share}>
        {copied ? <Check className="mr-2 size-4" aria-hidden="true" /> : <Share2 className="mr-2 size-4" aria-hidden="true" />}
        {copied ? "Copied" : "Share or copy"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={whatsapp}>WhatsApp</Button>
      <span className="text-xs text-muted-foreground">Only this public page title, date and link are shared.</span>
      {copyFailed ? <span role="alert" className="w-full text-xs text-destructive">Copy permission was unavailable. Use WhatsApp or copy the address from your browser.</span> : null}
    </div>
  );
}
