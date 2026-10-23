import { ARTICLES } from "@/lib/articles";
import { getAllBanks } from "@/lib/banks";
import { CHART_PAGES } from "@/lib/chart-pages";
import {
  BLUEPRINTS,
  DIRECT_PRICE_CITIES,
  GOV_DOCS,
  LEARN_TOPICS,
  PSYCH_TERMS,
  RECIPES,
  SLANG_TERMS,
} from "@/lib/data";
import { getAllLgaStates } from "@/lib/lgas";
import { getAllPostalAreaParams, getAllPostalStates, getPostalPlace } from "@/lib/postal";

/**
 * Data-driven SSOT tree for the minimal 6-bubble main-hub category bar.
 *
 * Rules:
 *  - Fixed minimal set of 6 main bubbles only: Money, Codes, Places, Guides, Street, Tools.
 *  - Max depth inside any panel is 2 levels: Bubble -> Subcategory (direct link OR group) -> Leaf link.
 *  - Nested chevrons (`children`) are present ONLY when `children.length > 0` from real SSOT loaders.
 *  - Places lists the 37 states (`/geo/[state]` -> "All LGAs in {State}"), NEVER all 774 LGAs inline.
 *  - Every single `href` points to an existing built NaijaCheck route — zero placeholders or "coming soon".
 *  - Re-running `npm run generate` / build automatically flows new banks, postal states/areas, LGA states,
 *    guides, slang terms, charts, cities, blueprints, and tools into this tree without editing React UI code.
 */

export const CATEGORY_BUBBLE_IDS = [
  "money",
  "codes",
  "places",
  "guides",
  "street",
  "tools",
] as const;

export type CategoryBubbleId = (typeof CATEGORY_BUBBLE_IDS)[number];

export type CategoryBubbleIconName =
  | "banknote"
  | "hash"
  | "map-pin"
  | "file-text"
  | "message-circle"
  | "wrench";

export type BubbleLeafLink = {
  label: string;
  href: string;
  meta?: string;
};

export type BubbleSubcategory = {
  id: string;
  label: string;
  href: string;
  meta?: string;
  /** Default expanded inside panel when category opens (only valid when `children` exist). */
  defaultExpanded?: boolean;
  /** Present ONLY when real SSOT children exist (`children.length > 0`). */
  children?: BubbleLeafLink[];
};

export type CategoryBubble = {
  id: CategoryBubbleId;
  label: string;
  /** Icon rendered immediately BEFORE `label`; dropdown chevron renders immediately AFTER `label`. */
  icon: CategoryBubbleIconName;
  hubHref: string;
  hubLabel: string;
  subcategories: BubbleSubcategory[];
};

export const STREET_SLANG_CAP = 12 as const;
export const POSTAL_DISTRICT_CAP = 12 as const;

function makeSubcategory(
  sub: Omit<BubbleSubcategory, "children"> & { children?: BubbleLeafLink[] },
): BubbleSubcategory | null {
  if (!sub.href || !sub.href.startsWith("/")) return null;
  const validChildren = (sub.children ?? []).filter(
    (c) => Boolean(c && typeof c.label === "string" && c.label.trim() && typeof c.href === "string" && c.href.startsWith("/")),
  );
  if (sub.children !== undefined && validChildren.length === 0) {
    // If a data-driven group currently has zero SSOT leaves, fall back to a plain hub link (no empty chevron)
    return {
      id: sub.id,
      label: sub.label,
      href: sub.href,
      meta: sub.meta,
    };
  }
  return {
    id: sub.id,
    label: sub.label,
    href: sub.href,
    meta: sub.meta,
    ...(validChildren.length > 0
      ? {
          defaultExpanded: Boolean(sub.defaultExpanded),
          children: validChildren,
        }
      : {}),
  };
}

function compactSubs(items: Array<BubbleSubcategory | null>): BubbleSubcategory[] {
  return items.filter((x): x is BubbleSubcategory => x !== null);
}

/**
 * Build the 6-bubble navigation tree from committed SSOT loaders.
 */
export function buildCategoryBubbleTree(): CategoryBubble[] {
  const banks = getAllBanks();
  const postalStates = getAllPostalStates();
  const postalDistricts = getAllPostalAreaParams()
    .slice(0, POSTAL_DISTRICT_CAP)
    .map((d) => {
      const resolved = getPostalPlace(d.state, d.area);
      return resolved ? { ...d, place: resolved.place, stateName: resolved.state.name } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const lgaStates = getAllLgaStates();

  const marketArticles = ARTICLES.filter((a) => a.section === "prices-market");
  const examArticles = ARTICLES.filter((a) => a.section === "exam");
  const telecomArticles = ARTICLES.filter((a) => a.section === "telecom");

  const sortedSlang = [...SLANG_TERMS].sort((a, b) => b.trendScore - a.trendScore);
  const topSlang = sortedSlang.slice(0, STREET_SLANG_CAP);

  // 1) Money — Rates, fuel, charts, city prices, markets, status
  const money: CategoryBubble = {
    id: "money",
    label: "Money",
    icon: "banknote",
    hubHref: "/rates",
    hubLabel: "FX rates & history hub",
    subcategories: compactSubs([
      makeSubcategory({
        id: "money-rates",
        label: "Dollar & FX Rates",
        href: "/rates",
        meta: "CBN + parallel",
      }),
      makeSubcategory({
        id: "money-rates-history",
        label: "FX History Archive",
        href: "/rates/history",
        meta: "stored readings",
      }),
      makeSubcategory({
        id: "money-fuel",
        label: "Fuel & Depot Prices",
        href: "/prices/fuel",
        meta: "PMS · AGO · LPG",
      }),
      makeSubcategory({
        id: "money-diesel",
        label: "Generator Diesel Guide",
        href: "/prices/generator-diesel",
      }),
      makeSubcategory({
        id: "money-charts",
        label: "Price Charts",
        href: "/charts",
        meta: `${CHART_PAGES.length} series`,
        children: CHART_PAGES.map((c) => ({
          label: c.name,
          href: `/charts/${c.slug}`,
          meta: c.unitLabel,
        })),
      }),
      makeSubcategory({
        id: "money-cities",
        label: "City Food Prices",
        href: "/prices",
        meta: `${DIRECT_PRICE_CITIES.length} cities`,
        children: [
          { label: "All City Food Prices", href: "/prices", meta: "overview" },
          ...DIRECT_PRICE_CITIES.map((city) => ({
            label: `${city.name} Prices`,
            href: `/prices/${city.slug}`,
            meta: city.state,
          })),
        ],
      }),
      ...(marketArticles.length > 0
        ? [
            makeSubcategory({
              id: "money-markets",
              label: "Major Market Guides",
              href: "/prices/markets",
              meta: `${marketArticles.length} markets`,
              children: marketArticles.map((m) => ({
                label: m.navLabel,
                href: m.path,
              })),
            }),
          ]
        : []),
      makeSubcategory({
        id: "money-status",
        label: "Source Status & Honesty",
        href: "/status",
        meta: "live health",
      }),
    ]),
  };

  // 2) Codes — Bank sort+USSD, postal/ZIP by state & curated districts
  const codes: CategoryBubble = {
    id: "codes",
    label: "Codes",
    icon: "hash",
    hubHref: "/codes",
    hubLabel: "All Nigerian codes hub",
    subcategories: compactSubs([
      makeSubcategory({
        id: "codes-banks",
        label: "Bank Sort & USSD Codes",
        href: "/codes/banks",
        meta: `${banks.length} banks`,
        children: [
          { label: "All Banks Directory", href: "/codes/banks", meta: `${banks.length} banks` },
          ...banks.map((b) => ({
            label: b.name,
            href: `/codes/banks/${b.slug}`,
            meta: [b.sortCodes[0]?.code, b.ussd[0]?.code].filter(Boolean).join(" · "),
          })),
        ],
      }),
      makeSubcategory({
        id: "codes-postal",
        label: "Postal / ZIP Codes by State",
        href: "/codes/postal",
        meta: `${postalStates.length} states`,
        children: [
          { label: "All Nigeria Postal Codes", href: "/codes/postal", meta: `${postalStates.length} states` },
          ...postalStates.map((s) => ({
            label: s.name,
            href: `/codes/postal/${s.slug}`,
            meta: s.headOfficeCode,
          })),
        ],
      }),
      ...(postalDistricts.length > 0
        ? [
            makeSubcategory({
              id: "codes-districts",
              label: "Popular District Postal Codes",
              href: "/codes/postal",
              meta: `${postalDistricts.length} areas`,
              children: postalDistricts.map((d) => ({
                label: d.place.name.split("—")[0].trim(),
                href: `/codes/postal/${d.state}/${d.area}`,
                meta: d.place.code,
              })),
            }),
          ]
        : []),
    ]),
  };

  // 3) Places — 37 states + FCT -> `/geo/[state]` ("All LGAs in {State}"), NEVER 774 rows inline
  const places: CategoryBubble = {
    id: "places",
    label: "Places",
    icon: "map-pin",
    hubHref: "/geo",
    hubLabel: "All 774 LGAs directory",
    subcategories: compactSubs([
      makeSubcategory({
        id: "places-states",
        label: "States & FCT Directory",
        href: "/geo",
        meta: `${lgaStates.length} states`,
        defaultExpanded: true,
        children: lgaStates.map((s) => ({
          label: `All LGAs in ${s.name}`,
          href: `/geo/${s.slug}`,
          meta: `${s.count} LGAs`,
        })),
      }),
    ]),
  };

  // 4) Guides — GovHowTo + real SSOT guide verticals (Learn, Exam, Telecom, Hustle)
  const guides: CategoryBubble = {
    id: "guides",
    label: "Guides",
    icon: "file-text",
    hubHref: "/howto",
    hubLabel: "All GovHowTo & practical guides",
    subcategories: compactSubs([
      makeSubcategory({
        id: "guides-howto",
        label: "GovHowTo Official Steps",
        href: "/howto",
        meta: `${GOV_DOCS.length} guides`,
        defaultExpanded: true,
        children: [
          { label: "All GovHowTo Guides", href: "/howto", meta: `${GOV_DOCS.length} guides` },
          ...GOV_DOCS.map((d) => ({
            label: d.title.replace(/\s+20\d\d$/, ""),
            href: `/howto/${d.slug}`,
          })),
        ],
      }),
      ...(LEARN_TOPICS.length > 0
        ? [
            makeSubcategory({
              id: "guides-learn",
              label: "Money & Everyday Life",
              href: "/learn",
              meta: `${LEARN_TOPICS.length} guides`,
              children: [
                { label: "All Learn Guides", href: "/learn" },
                ...LEARN_TOPICS.map((t) => ({
                  label: t.title,
                  href: `/learn/${t.slug}`,
                })),
              ],
            }),
          ]
        : []),
      ...(examArticles.length > 0
        ? [
            makeSubcategory({
              id: "guides-exam",
              label: "Exam Cut-Offs & Timetables",
              href: "/exam",
              meta: `${examArticles.length} guides`,
              children: [
                { label: "Exam Hub Overview", href: "/exam" },
                ...examArticles.map((a) => ({
                  label: a.navLabel,
                  href: a.path,
                })),
              ],
            }),
          ]
        : []),
      ...(telecomArticles.length > 0
        ? [
            makeSubcategory({
              id: "guides-telecom",
              label: "Telecom & Data Plans",
              href: "/telecom",
              meta: `${telecomArticles.length} guides`,
              children: [
                { label: "Telecom Hub Overview", href: "/telecom" },
                ...telecomArticles.map((a) => ({
                  label: a.navLabel,
                  href: a.path,
                })),
              ],
            }),
          ]
        : []),
      ...(BLUEPRINTS.length > 0
        ? [
            makeSubcategory({
              id: "guides-hustle",
              label: "Hustle Business Blueprints",
              href: "/hustle",
              meta: `${BLUEPRINTS.length} plans`,
              children: [
                { label: "Hustle Capital Matcher", href: "/hustle", meta: "hub" },
                ...BLUEPRINTS.map((b) => ({
                  label: b.name,
                  href: `/hustle/${b.slug}`,
                })),
              ],
            }),
          ]
        : []),
    ]),
  };

  // 5) Street — Trends hub + capped top slang terms + relationship/street terms + "See all" -> /trends
  const street: CategoryBubble = {
    id: "street",
    label: "Street",
    icon: "message-circle",
    hubHref: "/trends",
    hubLabel: "Open Slang & Trend Monitor",
    subcategories: compactSubs([
      makeSubcategory({
        id: "street-slang",
        label: "Trending Naija Slang",
        href: "/trends",
        meta: `top ${topSlang.length}`,
        defaultExpanded: true,
        children: [
          ...topSlang.map((t) => ({
            label: t.term,
            href: `/trends/${t.slug}`,
            meta: `score ${t.trendScore}`,
          })),
          {
            label: `See all ${SLANG_TERMS.length} slang terms →`,
            href: "/trends",
          },
        ],
      }),
      ...(PSYCH_TERMS.length > 0
        ? [
            makeSubcategory({
              id: "street-psych",
              label: "Relationship & Group-Chat Terms",
              href: "/trends",
              meta: `${PSYCH_TERMS.length} terms`,
              children: PSYCH_TERMS.map((p) => ({
                label: p.term,
                href: `/trends/${p.slug}`,
              })),
            }),
          ]
        : []),
    ]),
  };

  // 6) Tools — Tools hub, quiz, key calculators, cookbook recipes
  const tools: CategoryBubble = {
    id: "tools",
    label: "Tools",
    icon: "wrench",
    hubHref: "/tools",
    hubLabel: "All calculators & tools",
    subcategories: compactSubs([
      makeSubcategory({
        id: "tools-quiz",
        label: "Price IQ & Slang Quiz",
        href: "/tools/quiz",
        meta: "2 quizzes",
      }),
      makeSubcategory({
        id: "tools-generator",
        label: "Generator Fuel Calculator",
        href: "/tools/generator",
        meta: "PMS / AGO",
      }),
      makeSubcategory({
        id: "tools-solar",
        label: "Solar Inverter Payback",
        href: "/tools/solar",
        meta: "ROI years",
      }),
      makeSubcategory({
        id: "tools-col",
        label: "Cost-of-Living Calculator",
        href: "/prices/cost-of-living",
        meta: "monthly budget",
      }),
      ...(RECIPES.length > 0
        ? [
            makeSubcategory({
              id: "tools-cookbook",
              label: "Recipe Cost Cookbook",
              href: "/tools/cookbook",
              meta: `${RECIPES.length} dishes`,
              children: [
                { label: "Cookbook Overview", href: "/tools/cookbook" },
                ...RECIPES.map((r) => ({
                  label: r.name,
                  href: `/tools/cookbook/${r.slug}`,
                })),
              ],
            }),
          ]
        : []),
    ]),
  };

  return [money, codes, places, guides, street, tools];
}

/**
 * Flatten every href reachable from a bubble tree (hubs, subcategories, and leaves)
 * for route-integrity auditing in tests.
 */
export function collectAllBubbleHrefs(bubbles: readonly CategoryBubble[]): string[] {
  const out: string[] = [];
  for (const b of bubbles) {
    out.push(b.hubHref);
    for (const sub of b.subcategories) {
      out.push(sub.href);
      for (const leaf of sub.children ?? []) {
        out.push(leaf.href);
      }
    }
  }
  return out;
}
