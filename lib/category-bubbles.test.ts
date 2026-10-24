/**
 * Unit & static-audit test for the minimal 6-bubble main-hub category bar:
 *  1) SSOT tree: strictly 6 main bubbles (Money, Codes, Places, Guides, Street, Tools),
 *     2-level max depth, nested chevrons only when real SSOT children exist, Places capped
 *     to 37 state hubs (never 774 inline LGAs), zero placeholder/missing routes.
 *  2) Pill & panel markup/CSS: [icon] [Name] [chevron] order, accessible names, aria-expanded,
 *     opaque .nc-bubble-dropdown-panel surface, home-first placement preserving ExploreGrid.
 *  3) Controller: idle drift pause/resume, nested toggles, 10s auto-close timer (arm on leave,
 *     cancel on re-entry, close at 10s), and prefers-reduced-motion: reduce path.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildCategoryBubbleTree,
  CATEGORY_BUBBLE_IDS,
  collectAllBubbleHrefs,
  POSTAL_DISTRICT_CAP,
  STREET_SLANG_CAP,
} from "./category-bubbles";
import {
  CATEGORY_PANEL_AUTO_CLOSE_MS,
  createCategoryBubbleController,
} from "./category-bubble-controller";
import { getAllBanks } from "./banks";
import { getAllAirports } from "./airports";
import { getAllAirlines } from "./airlines";
import { getAllOilGasOperators } from "./oil-gas";
import { getAllPorts } from "./ports";
import { getAllPostalStates } from "./postal";
import { getAllLgaStates } from "./lgas";
import { GOV_DOCS } from "./data";
import type { SearchEntry } from "./types";

function fakeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    scheduler: {
      setTimeout(fn: () => void, ms: number) {
        const id = ++seq;
        timers.set(id, { at: now + Math.max(0, ms), fn });
        return id;
      },
      clearTimeout(id: unknown) {
        timers.delete(id as number);
      },
    },
    pendingCount() {
      return timers.size;
    },
    advance(ms: number) {
      const target = now + ms;
      while (true) {
        let nextId: number | null = null;
        let nextAt = Infinity;
        for (const [id, t] of timers) {
          if (t.at <= target && t.at < nextAt) {
            nextAt = t.at;
            nextId = id;
          }
        }
        if (nextId === null) break;
        const entry = timers.get(nextId)!;
        timers.delete(nextId);
        now = entry.at;
        entry.fn();
      }
      now = target;
    },
  };
}

function run() {
  const root = path.resolve(__dirname, "..");
  const tree = buildCategoryBubbleTree();

  // -------------------------------------------------------------------------
  // 1) Fixed minimal set of 6 main bubbles + SSOT structure & depth rules
  // -------------------------------------------------------------------------
  assert.equal(tree.length, 6, "strictly 6 main category bubbles");
  assert.deepEqual(
    tree.map((b) => b.id),
    [...CATEGORY_BUBBLE_IDS],
    "exact 6 bubble IDs: money, codes, places, guides, street, tools",
  );
  assert.deepEqual(
    tree.map((b) => b.label),
    ["Money", "Codes", "Places", "Guides", "Street", "Tools"],
    "exact 6 bubble labels",
  );

  // Never include empty future buckets like "Archives" or "Coming soon"
  const serialized = JSON.stringify(tree);
  assert.ok(!/coming soon/i.test(serialized), "zero 'coming soon' placeholders");
  assert.ok(!tree.some((b) => /archive/i.test(b.label)), "no 'Archives' top-level bubble");

  for (const b of tree) {
    assert.ok(b.icon && b.label && b.hubHref.startsWith("/"), `valid bubble header: ${b.id}`);
    assert.ok(b.subcategories.length > 0, `bubble ${b.id} must have real subcategories`);
    for (const sub of b.subcategories) {
      assert.ok(sub.id && sub.label && sub.href.startsWith("/"), `valid subcategory: ${sub.id}`);
      if (sub.children !== undefined) {
        assert.ok(
          Array.isArray(sub.children) && sub.children.length > 0,
          `subcategory ${sub.id} must only define children when non-empty (no empty nested chevrons)`,
        );
        for (const leaf of sub.children) {
          assert.ok(leaf.label.trim().length > 0 && leaf.href.startsWith("/"), `valid leaf under ${sub.id}`);
          // Enforce max depth = 2 levels (leaf links never carry nested children)
          assert.ok(!("children" in leaf), `leaf ${leaf.href} must not nest deeper than 2 levels`);
        }
      }
    }
  }

  // SSOT completeness checks
  const codesBubble = tree.find((b) => b.id === "codes")!;
  const banksSub = codesBubble.subcategories.find((s) => s.id === "codes-banks")!;
  const postalSub = codesBubble.subcategories.find((s) => s.id === "codes-postal")!;
  const districtsSub = codesBubble.subcategories.find((s) => s.id === "codes-districts")!;
  assert.ok(banksSub?.children && banksSub.children.length === getAllBanks().length + 1, "Codes -> Banks lists hub + every SSOT bank");
  assert.ok(postalSub?.children && postalSub.children.length === getAllPostalStates().length + 1, "Codes -> Postal lists hub + all 37 SSOT states");
  assert.ok((districtsSub?.children?.length ?? 0) <= POSTAL_DISTRICT_CAP, "Codes -> Districts stays capped");

  // Places: 37 states (`/geo/[state]`), NEVER 774 inline LGAs (`/geo/[state]/[lga]`)
  const placesBubble = tree.find((b) => b.id === "places")!;
  const placesStatesSub = placesBubble.subcategories.find((s) => s.id === "places-states")!;
  assert.equal(placesStatesSub.children?.length, getAllLgaStates().length, "Places lists all 37 state directories");
  assert.equal(placesStatesSub.defaultExpanded, true, "Places -> States opens expanded by default");
  for (const leaf of placesStatesSub.children ?? []) {
    const segments = leaf.href.split("/").filter(Boolean);
    assert.equal(segments.length, 2, `Places leaf ${leaf.href} must be /geo/[state], never a 3-segment inline LGA`);
    assert.match(leaf.label, /^All LGAs in /, "Places state label uses 'All LGAs in {State}'");
  }
  const placesAirportsSub = placesBubble.subcategories.find((s) => s.id === "places-airports")!;
  assert.ok(placesAirportsSub, "Airports lives under Places bubble (no 7th top-level bubble)");
  assert.equal(placesAirportsSub.href, "/airports");
  assert.equal(
    placesAirportsSub.children?.length,
    getAllAirports().length + 1,
    "Places -> Airports lists hub + all 24 SSOT airports",
  );
  const placesAirlinesSub = placesBubble.subcategories.find((s) => s.id === "places-airlines")!;
  assert.ok(placesAirlinesSub, "Airlines lives under Places bubble next to Airports (strictly 6 top-level bubbles)");
  assert.equal(placesAirlinesSub.href, "/airlines");
  assert.equal(
    placesAirlinesSub.children?.length,
    getAllAirlines().length + 1,
    "Places -> Airlines lists hub + all 23 SSOT airlines",
  );
  const placesOilGasSub = placesBubble.subcategories.find((s) => s.id === "places-oil-gas")!;
  assert.ok(placesOilGasSub, "Oil & Gas Operators lives under Places bubble (strictly 6 top-level bubbles)");
  assert.equal(placesOilGasSub.href, "/oil-gas");
  assert.equal(
    placesOilGasSub.children?.length,
    getAllOilGasOperators().length + 1,
    "Places -> Oil & Gas Operators lists hub + all 16 SSOT operators",
  );
  const placesPortsSub = placesBubble.subcategories.find((s) => s.id === "places-ports")!;
  assert.ok(placesPortsSub, "Seaports lives under Places bubble (strictly 6 top-level bubbles)");
  assert.equal(placesPortsSub.href, "/ports");
  assert.equal(
    placesPortsSub.children?.length,
    getAllPorts().length + 1,
    "Places -> Seaports lists hub + all 12 SSOT ports",
  );

  // Guides: includes all GovHowTo slugs from SSOT
  const guidesBubble = tree.find((b) => b.id === "guides")!;
  const howtoSub = guidesBubble.subcategories.find((s) => s.id === "guides-howto")!;
  for (const doc of GOV_DOCS) {
    assert.ok(
      howtoSub.children?.some((c) => c.href === `/howto/${doc.slug}`),
      `Guides -> GovHowTo includes /howto/${doc.slug}`,
    );
  }

  // Street: slang terms capped + "See all" -> /trends
  const streetBubble = tree.find((b) => b.id === "street")!;
  const slangSub = streetBubble.subcategories.find((s) => s.id === "street-slang")!;
  assert.equal(slangSub.children?.length, STREET_SLANG_CAP + 1, "Street -> Slang capped at 12 + See all link");
  assert.equal(slangSub.children?.at(-1)?.href, "/trends", "Street -> Slang ends with See all -> /trends");

  // Money includes Status as a child link rather than a 7th bubble
  const moneyBubble = tree.find((b) => b.id === "money")!;
  assert.ok(moneyBubble.subcategories.some((s) => s.href === "/status"), "Status lives under Money, not as a 7th bubble");

  // Zero dead hrefs: every href in the bubble tree must exist in public/search-index.json (and out/ when built)
  const searchIndexPath = path.join(root, "public", "search-index.json");
  assert.ok(fs.existsSync(searchIndexPath), "public/search-index.json must exist");
  const searchIndex = JSON.parse(fs.readFileSync(searchIndexPath, "utf-8")) as SearchEntry[];
  const validRoutes = new Set(searchIndex.map((e) => e.path));

  const allHrefs = collectAllBubbleHrefs(tree);
  assert.ok(allHrefs.length >= 120, `expected rich SSOT link set, got ${allHrefs.length}`);
  for (const href of allHrefs) {
    assert.ok(validRoutes.has(href), `bubble href "${href}" must exist as a real NaijaCheck route`);
  }

  const outDir = path.join(root, "out");
  if (fs.existsSync(path.join(outDir, "index.html"))) {
    for (const href of new Set(allHrefs)) {
      const htmlFile =
        href === "/"
          ? path.join(outDir, "index.html")
          : fs.existsSync(path.join(outDir, `${href.slice(1)}.html`))
            ? path.join(outDir, `${href.slice(1)}.html`)
            : path.join(outDir, href.slice(1), "index.html");
      assert.ok(fs.existsSync(htmlFile), `built static HTML must exist for bubble href ${href}`);
    }
  }

  // -------------------------------------------------------------------------
  // 2) Component markup: [icon] [Name] [chevron], opaque panel & placement
  // -------------------------------------------------------------------------
  const clientSrc = fs.readFileSync(
    path.join(root, "components/home/category-bubble-bar-client.tsx"),
    "utf-8",
  );
  const iconIdx = clientSrc.indexOf('data-bubble-part="icon"');
  const labelIdx = clientSrc.indexOf('data-bubble-part="label"');
  const chevronIdx = clientSrc.indexOf('data-bubble-part="chevron"');
  assert.ok(iconIdx > 0 && labelIdx > iconIdx && chevronIdx > labelIdx, "pill renders [icon] [Name] [chevron] in exact order");
  assert.ok(clientSrc.includes("aria-expanded={isOpen}"), "bubble button sets aria-expanded");
  assert.ok(clientSrc.includes('menu`}'), "bubble button provides accessible '{Name}, open/close menu' label");
  assert.ok(clientSrc.includes("if (!hasChildren)") && clientSrc.includes('data-nested-chevron="true"'), "nested chevrons render only when children exist");
  assert.ok(clientSrc.includes("nc-bubble-dropdown-panel") && clientSrc.includes("bg-popover"), "dropdown panel uses opaque .nc-bubble-dropdown-panel + bg-popover");
  assert.ok(!/bg-popover\/\d+/.test(clientSrc), "dropdown panel never uses translucent bg-popover/XX alpha");

  const globalsCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf-8");
  assert.ok(
    globalsCss.includes(".nc-bubble-dropdown-panel") &&
      globalsCss.includes("background-color: hsl(var(--popover));"),
    "globals.css enforces solid hsl(var(--popover)) on .nc-bubble-dropdown-panel",
  );

  const homeSrc = fs.readFileSync(path.join(root, "app/page.tsx"), "utf-8");
  assert.ok(homeSrc.includes("<CategoryBubbleBar />"), "CategoryBubbleBar rendered on home page");
  assert.ok(homeSrc.includes("<ExploreGrid />"), "lower ExploreGrid preserved on home page");
  assert.ok(
    homeSrc.indexOf("<CategoryBubbleBar />") < homeSrc.indexOf("<DailyBriefing />"),
    "CategoryBubbleBar sits above DailyBriefing on home page",
  );

  // -------------------------------------------------------------------------
  // 3) Controller: drift pause/resume, 10s auto-close & reduced-motion path
  // -------------------------------------------------------------------------
  assert.equal(CATEGORY_PANEL_AUTO_CLOSE_MS, 10_000, "auto-close timeout is 10s");
  {
    const clock = fakeClock();
    const ctrl = createCategoryBubbleController({
      bubbles: tree,
      scheduler: clock.scheduler,
    });

    // Initial idle state: drifts cleanly, nothing open
    assert.equal(ctrl.getSnapshot().openCategoryId, null);
    assert.equal(ctrl.getSnapshot().canAutoDrift, true);
    assert.equal(ctrl.getSnapshot().autoCloseArmed, false);

    // Desktop hover pauses drift; leaving resumes drift
    ctrl.updateEngagement({ pointerInside: true });
    assert.equal(ctrl.getSnapshot().canAutoDrift, false);
    ctrl.updateEngagement({ pointerInside: false });
    assert.equal(ctrl.getSnapshot().canAutoDrift, true);

    // Touch pauses drift; touch end resumes drift
    ctrl.updateEngagement({ touchActive: true });
    assert.equal(ctrl.getSnapshot().canAutoDrift, false);
    ctrl.updateEngagement({ touchActive: false });
    assert.equal(ctrl.getSnapshot().canAutoDrift, true);

    // Open Codes while pointer is inside bar -> drift paused, timer NOT armed while user is inside
    ctrl.updateEngagement({ pointerInside: true });
    ctrl.toggleCategory("codes");
    assert.equal(ctrl.getSnapshot().openCategoryId, "codes");
    assert.equal(ctrl.getSnapshot().canAutoDrift, false);
    assert.equal(ctrl.getSnapshot().autoCloseArmed, false);
    clock.advance(60_000);
    assert.equal(ctrl.getSnapshot().openCategoryId, "codes", "panel stays open indefinitely while user hovers/focuses inside");

    // Toggle nested subgroup (codes-banks) open & closed; childless items ignored
    ctrl.toggleSubcategory("codes-banks");
    assert.ok(ctrl.getSnapshot().expandedSubcategoryIds.includes("codes-banks"));
    ctrl.toggleSubcategory("codes-banks");
    assert.ok(!ctrl.getSnapshot().expandedSubcategoryIds.includes("codes-banks"));

    // User leaves bar & panel -> 10s auto-close timer starts
    ctrl.updateEngagement({ pointerInside: false, focusInside: false, touchActive: false });
    assert.equal(ctrl.getSnapshot().autoCloseArmed, true);
    assert.equal(clock.pendingCount(), 1);

    // Advance 9.5s -> still open!
    clock.advance(9_500);
    assert.equal(ctrl.getSnapshot().openCategoryId, "codes");

    // User re-enters panel at 9.5s -> timer cancelled!
    ctrl.updateEngagement({ pointerInside: true });
    assert.equal(ctrl.getSnapshot().autoCloseArmed, false);
    assert.equal(clock.pendingCount(), 0);
    clock.advance(20_000);
    assert.equal(ctrl.getSnapshot().openCategoryId, "codes", "re-entry cancels pending auto-close");

    // User leaves again -> fresh full 10s countdown starts
    ctrl.updateEngagement({ pointerInside: false });
    assert.equal(ctrl.getSnapshot().autoCloseArmed, true);
    clock.advance(9_999);
    assert.equal(ctrl.getSnapshot().openCategoryId, "codes", "still open at 9,999ms after second leave");
    clock.advance(1);
    assert.equal(ctrl.getSnapshot().openCategoryId, null, "auto-closes at 10,000ms after leaving bar & panel");
    assert.equal(ctrl.getSnapshot().canAutoDrift, true, "resumes gentle drift once auto-closed and idle");

    // Second chevron click closes immediately and clears timer
    ctrl.toggleCategory("places");
    assert.equal(ctrl.getSnapshot().openCategoryId, "places");
    assert.ok(ctrl.getSnapshot().expandedSubcategoryIds.includes("places-states"), "Places auto-expands states list");
    ctrl.toggleCategory("places");
    assert.equal(ctrl.getSnapshot().openCategoryId, null);
    assert.equal(clock.pendingCount(), 0);

    // prefers-reduced-motion: reduce -> never auto-drifts, but open/close & 10s auto-close still work
    ctrl.updateEngagement({ reducedMotion: true });
    assert.equal(ctrl.getSnapshot().canAutoDrift, false, "no auto-drift under prefers-reduced-motion: reduce");
    ctrl.toggleCategory("tools");
    assert.equal(ctrl.getSnapshot().openCategoryId, "tools", "open still works under reduced motion");
    assert.equal(ctrl.getSnapshot().canAutoDrift, false);
    clock.advance(10_000);
    assert.equal(ctrl.getSnapshot().openCategoryId, null, "10s auto-close still works under reduced motion");
    assert.equal(ctrl.getSnapshot().canAutoDrift, false, "remains non-drifting after close under reduced motion");

    ctrl.destroy();
  }

  console.log(
    `ok - category bubble bar: 6 SSOT bubbles (${allHrefs.length} verified links, Places=37 states, 0 missing routes) + [icon][Name][chevron] + opaque panel + 10s auto-close + reduced-motion`,
  );
}

run();
