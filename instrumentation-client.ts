/**
 * Client instrumentation (Next.js 15.3+): evaluated once before hydration, in the main bundle on
 * every page — keep it tiny. The only hook used feeds the light navigation feedback store (thin top
 * bar + delayed logo pulse). It observes navigations; it never intercepts, delays or blocks them.
 * Next calls it as (url, "push" | "replace" | "traverse"); every type is handled the same way.
 * See lib/nav-feedback.ts and docs/runbooks/navigation-feedback.md.
 */
import { navFeedback } from "@/lib/nav-feedback";

export function onRouterTransitionStart(url: string): void {
  navFeedback.startNavigation(url);
}
