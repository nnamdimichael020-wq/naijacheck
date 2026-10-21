"use client";

import * as React from "react";
import { INLINE_SPINNER_DELAY_MS } from "@/lib/nav-feedback";
import { cn } from "@/lib/utils";

/**
 * Tiny CSS spinner for a pending BUTTON (push, tools, quiz) — never an overlay. It rotates only under
 * `prefers-reduced-motion: no-preference`; with `reduce` it is a static ring (app/globals.css).
 * Decorative: keep a text label on the button ("Enabling…") and set `aria-busy` while pending.
 */
export function InlineSpinner({ className }: { className?: string }) {
  return <span aria-hidden="true" data-inline-spinner="" className={cn("inline-spinner", className)} />;
}

/**
 * `true` only once `active` has stayed true for `delayMs`, so a fast action never flashes a spinner.
 * Purely cosmetic: it never delays the action or its result.
 */
export function useDelayedFlag(active: boolean, delayMs: number = INLINE_SPINNER_DELAY_MS): boolean {
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (!active) {
      setShown(false);
      return;
    }
    const timer = window.setTimeout(() => setShown(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return active && shown;
}
