# Navigation feedback (thin top strip + delayed logo pulse)

NaijaCheck gives **light** feedback while a page change is pending. There is **no full-screen or branded loader**
for page transitions. Most navigations are prefetched and show nothing at all; feedback appears only when the
visitor would otherwise be left wondering whether the tap registered, and it disappears the moment the new page
is on screen. Evidence for the numbers below: `docs/evidence/nav-feedback-2026-10-21.md`.

## What the visitor sees

| Situation | What appears |
| --- | --- |
| Fast navigation (prefetched link, or the new page renders within 150 ms) | Nothing. The new page simply appears. |
| Navigation still pending after **150 ms** | A **3px brand-green strip** at the very top of the screen. It grows on its own (CSS only) and does not cover anything. |
| Navigation or marked action still pending after **300 ms** | The strip, plus a **small pulse on the header logo** (scale 1 → 0.9, opacity 1 → 0.72, 1.2 s cycle). |
| The new page renders | The pulse stops and the strip finishes **in the same frame**. The strip then fades out over about 0.3 s, on top of content that is already shown and usable. |
| Same-page or hash links, query-only changes, the skip link | Nothing. |
| Back/forward restored from the router cache | Nothing (it is instant). |
| `prefers-reduced-motion: reduce` | A **static full-width strip** while pending, which hides instantly. The logo never pulses. No animation, transition or transform. |
| Tools / push buttons (hustle demo payment, Enable alerts, Unsubscribe) | A **tiny spinner on that button only**, after 150 ms, with `aria-busy`. The text label stays ("Enabling…"). No page-level indicator. |
| Never | A full-screen or branded loader, a `loading.tsx` screen, an overlay, or content held back for a minimum time. |

The old page stays visible, scrollable and tappable while a navigation is pending. The strip is
`pointer-events: none` and `aria-hidden`. Screen-reader users still get Next's built-in route announcement
when the new page renders.

## How it is wired

| Piece | Role |
| --- | --- |
| `instrumentation-client.ts` | Next 15.3+ client hook. `onRouterTransitionStart(url)` fires for `<Link>` clicks, `router.push/replace` and back/forward. It only calls `navFeedback.startNavigation(url)`. It observes navigations and never intercepts, delays or blocks them. |
| `lib/nav-feedback.ts` | Framework-free store holding the policy and timers. It tracks only same-origin **pathname** changes. A same-page or hash transition that supersedes a pending one finishes it at once (Next discards the pending navigation). It is unit-tested with an injected clock. |
| `components/navigation-feedback.tsx` | Mounted in `app/layout.tsx` right after the skip link. It renders the strip (`data-nav-progress="idle"`, `aria-hidden`). When `usePathname()` changes, a layout effect (before paint) calls `commitPathname()`, which finishes the navigation. It also toggles `html[data-nav-slow]`. |
| `components/site-header.tsx` | The header logo has the class `nav-logo-mark`. It is the only element the pulse may animate, and the header is sticky, so it is always visible. |
| `app/globals.css` | Static by default. All motion sits under `@media (prefers-reduced-motion: no-preference)`. The `reduce` block sets animation, transition and transform to `none !important` for `.nav-progress`, `.nav-progress-bar`, `.nav-logo-mark` and `.inline-spinner`. |
| `components/ui/inline-spinner.tsx` | `InlineSpinner` is a CSS ring, `aria-hidden`, that rotates only when motion is allowed. `useDelayedFlag(pending)` makes it appear only after 150 ms, so fast actions never flash a spinner. |

There are no new dependencies. There is no Lottie, no JS animation loop, and no timers or listeners while idle.

## Switches and thresholds

Everything lives in `NAV_FEEDBACK_CONFIG` in `lib/nav-feedback.ts`:

| Key | Default | Meaning |
| --- | --- | --- |
| `progressBar` | `true` | Set `false` to remove the top strip site-wide. The logo pulse can stay. |
| `logoPulse` | `true` | Set `false` to stop the logo from ever pulsing. The strip can stay. |
| `barDelayMs` | `150` | How long a navigation must still be pending before the strip appears. |
| `pulseDelayMs` | `300` | How long a navigation or marked action must still be pending before the logo pulses. |
| `finishMs` | `320` | How long the strip's finishing fade lasts after content is shown. It never holds content. |
| `safetyTimeoutMs` | `20000` | A defensive cap that clears the indicators if a navigation never reports completion. |

`npm run navfeedback:test` enforces these limits:
- the strip waits at least 100 ms, and less than the pulse delay;
- the pulse delay is between 250 and 350 ms;
- the finish is 400 ms or less;
- the safety cap is at least 10 s.

## Marked actions (logo pulse for non-navigation waits)

```ts
import { navFeedback } from "@/lib/nav-feedback";

await navFeedback.trackAction(refreshSomething());   // or: const end = navFeedback.beginAction(); … end();
```

- A marked action can pulse the logo once it has been pending for 300 ms or more. It **never** shows the top strip.
  It always ends, including on rejection, and is capped by `safetyTimeoutMs`.
- Use it only for a page-level wait that is not a navigation.
- **No current UI marks an action, on purpose.** Tools and quiz actions get button-only feedback. The push enable
  flow opens the browser's permission prompt first, so a page-level pulse would run while the visitor is reading
  the prompt. Quiz, calculators and share are synchronous and need no spinner.
- Button feedback pattern: `const busy = useDelayedFlag(pending)`, then render `{busy ? <InlineSpinner /> : null}`
  inside the button, add `aria-busy={pending || undefined}`, and keep a text label.

Where button spinners are used:
- push "Enable alerts" (both the invitation and `/status` settings);
- push "Unsubscribe and clear";
- the hustle "Pay … (demo)" button;
- the location card's "Checking your network location". It previously used a lucide `animate-spin` icon that ignored reduced motion.

Search: pressing **Enter** on a result is now a client navigation (`router.push`), the same as tapping a result.
Previously it was a full page reload (`window.location.href`). This is lighter on 3G, and the result is usually
already prefetched.

## Behaviour on fast vs slow networks (measured)

These were measured in headless Chromium with a 390×844 phone emulation and DevTools throttling presets.
Times are ms after the tap; see the evidence file.

| Network and link | Content on screen | Strip | Logo pulse | Strip finishes / pulse stops |
| --- | --- | --- | --- | --- |
| Fast, link prefetched (bottom nav) | 20–42 ms | not shown | none | — |
| Fast, 4× CPU slowdown (low-end phone), prefetched | 73–127 ms | not shown | none | — |
| Fast, link **not** prefetched (footer) | 38 ms | not shown | none | — |
| **Fast 3G** (562.5 ms RTT, 1.44 Mbps), not prefetched | 1,233 ms | 152 ms | 305 ms | 1,233 ms (same frame as content) |
| **Slow 3G** (2 s RTT, 400 kbps), not prefetched | 4,285 ms | 152 ms | 305 ms | 4,285 ms (same frame as content) |
| Slow 3G + reduced motion | 4,283 ms | 152 ms (static strip) | logo not animated | 4,283 ms, hidden instantly |
| Back/forward on Slow 3G | 13–25 ms | not shown | none | — |
| Search Enter on Fast 3G (result prefetched) | 33 ms | not shown | none | — |

Real phones add CDN latency, but the shape is the same:
- on a good connection, prefetched pages show nothing;
- on 3G, a tap on a link whose prefetch has not arrived shows the strip at about 0.15 s and the pulse at about 0.3 s, and both end with the content.

The added cost per first page load is about **1.7 KB gzip**: about 1.2 KB JS for the hook and store, about 0.2 KB for the layout component, and about 0.3 KB CSS.
That is roughly 9 ms of transfer on Fast 3G and 34 ms on Slow 3G.

## Guards

- **`npm run navfeedback:test`** (part of `npm test`) has 30 tests:
  - the threshold policy and path filtering;
  - fast, medium and slow timelines;
  - no minimum display time;
  - chained, superseded and back/forward navigations;
  - the safety cap and marked actions;
  - the config switches;
  - the SSR markup;
  - a CSS policy check: fixed 3px strip, motion only under `no-preference`, logo animated only under `html[data-nav-slow]`, `reduce` kills everything, no bounce, no full-screen rule;
  - no `app/**/loading.*`.
- **`npm run audit:static`** (`navFeedback` section). Every page with the site shell must have:
  - exactly one strip, `idle` and `aria-hidden`;
  - exactly one `nav-logo-mark`;
  - no loader-style Tailwind animation (`animate-spin|bounce|ping|pulse`) without `motion-safe:`.

  It also fails on any route `loading.*` file. In the compiled CSS it checks that:
  - the strip is fixed at the top, `pointer-events: none` and at most 4px high;
  - nav and spinner motion exists only under `no-preference`;
  - the logo pulse binds only to `html[data-nav-slow]`;
  - `reduce` disables animation, transition and transform.

  `/offline` (a static `public/` file without the shell) is excluded.
- **`scripts/qa/nav-feedback-check.mjs`**: a real-browser run with 82 checks plus 2 informational readings, including the timelines above. Run it with:

  ```bash
  npm run build
  npm i --no-save puppeteer-core@23            # or set PUPPETEER_MODULE_DIR
  CHROME_PATH=/path/to/chrome node scripts/qa/nav-feedback-check.mjs --out /tmp/nav-feedback-qa
  ```

  Notes:
  - Navigation scenarios bypass the service worker, because fetches it proxies run outside page-level throttling. It never caches RSC `.txt` payloads, so on a phone those requests hit the network anyway.
  - The push scenario stubs `Notification.permission` because `chrome-headless-shell` hard-denies notifications. The real component, service worker and `pushManager` still run.

## Phone check (on device, still required)

Test on Android Chrome and iOS Safari, on the live site, ideally on mobile data.
1. Tap the bottom-nav items. When the page appears straight away, no strip or pulse should flash.
2. Scroll to the footer and tap **Privacy** or **About**. On a slow connection, the strip should appear at the top within about 0.15 s and the logo should pulse after about 0.3 s. Both stop the moment the page appears. You can still scroll and tap the old page meanwhile.
3. Turn on Reduce Motion:
   - iOS: Settings → Accessibility → Motion → Reduce Motion;
   - Android: Settings → Accessibility → Remove animations.

   Repeat step 2. The strip should be static and the logo still.
4. Press Back and Forward. Nothing should stay on screen.
5. On `/hustle`, tap Unlock premium, then Pay (demo). The spinner appears on the button only.
6. On `/status`, tap Enable alerts. The spinner appears on the button while the prompt and subscription run. The existing success and error messages are unchanged.

## Troubleshooting and rules

- **Strip stuck?** It cannot outlive `safetyTimeoutMs` (20 s). Check whether the navigation changed the
  pathname: query-only changes are deliberately untracked.
- **Strip shows on most taps in `next dev`?** That is expected. Dev compiles routes on demand. Production
  navigations are prefetched and silent.
- Do not add `app/**/loading.tsx`, a route-level spinner, or a full-screen splash for transitions. The audit and tests fail.
- Do not use `animate-spin`, `animate-bounce`, `animate-ping` or `animate-pulse` without `motion-safe:`. Prefer `InlineSpinner`.
- Any new animated element must put its motion under `no-preference` and be added to the `reduce` block.
