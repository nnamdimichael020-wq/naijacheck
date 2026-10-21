"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { navFeedback } from "@/lib/nav-feedback";

/**
 * Light navigation feedback — see lib/nav-feedback.ts and docs/runbooks/navigation-feedback.md.
 *
 * Renders only a 3px top strip (`.nav-progress`, aria-hidden, pointer-events: none). It shows when a
 * client navigation is still pending after 150 ms; the header logo pulses (html[data-nav-slow]) past
 * 300 ms. Both clear in the same frame the new route commits — this component never delays, covers
 * or replaces content, and there is no full-screen loader. Route changes are still announced to
 * screen readers by Next's built-in route announcer, so the strip stays purely decorative.
 */
export function NavigationFeedback() {
  const pathname = usePathname();
  const { bar, slow } = useSyncExternalStore(navFeedback.subscribe, navFeedback.getSnapshot, navFeedback.getServerSnapshot);

  // usePathname() changes in the same commit as the new route's content: finish before paint.
  useLayoutEffect(() => {
    navFeedback.commitPathname(pathname ?? window.location.pathname);
  }, [pathname]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (slow) root.setAttribute("data-nav-slow", "");
    else root.removeAttribute("data-nav-slow");
  }, [slow]);

  return (
    <div className="nav-progress" data-nav-progress={bar} aria-hidden="true">
      <div className="nav-progress-bar" />
    </div>
  );
}
