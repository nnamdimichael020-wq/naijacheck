/**
 * Typed access to everything in /data. Pages (server) and calculators (client) both use these
 * helpers so the maths is identical everywhere. All prices are INDICATIVE unless a source is cited.
 */
import citiesFile from "@/data/cities.json";
import pricesFile from "@/data/prices.json";
import fuelFile from "@/data/fuel.json";
import ratesFile from "@/data/rates.json";
import slangFile from "@/data/slang.json";
import blueprintsFile from "@/data/blueprints.json";
import govhowtoFile from "@/data/govhowto.json";
import examFile from "@/data/exam.json";
import telecomFile from "@/data/telecom.json";
import recipesFile from "@/data/recipes.json";
import learnFile from "@/data/learn.json";
import sponsorsFile from "@/data/sponsors.json";
import marketsFile from "@/data/markets.json";

export type Band = [number, number];

export const CITIES = citiesFile.cities;
export type City = (typeof CITIES)[number];

export const CITY_BY_SLUG: Record<string, City> = Object.fromEntries(CITIES.map((c) => [c.slug, c]));

export const PRICE_ITEMS = pricesFile.items;
export type PriceItem = (typeof PRICE_ITEMS)[number];
export const ITEM_BY_SLUG: Record<string, PriceItem> = Object.fromEntries(PRICE_ITEMS.map((i) => [i.slug, i]));
/** Cities with explicit rows for every tracked food item. No cost-index interpolation is allowed. */
export const DIRECT_PRICE_CITIES = CITIES.filter((city) =>
  PRICE_ITEMS.every((item) => Boolean((item.prices as Record<string, number[]>)[city.slug])),
);

export const PRICES_META = {
  updatedAt: pricesFile.updatedAt,
  status: pricesFile.status,
  sourceNote: pricesFile.sourceNote,
  cityIndexNote: pricesFile.cityIndexNote,
};

export const BASKET = pricesFile.basket;

/** Items that get a city-by-item landing page (/prices/[city]/[item]). Others are listed without links. */
export const ITEM_PAGE_SLUGS = ["rice", "garri", "beans", "yam", "egg"];
export const NON_FOOD = pricesFile.monthlyNonFoodEstimates;

export const MARKETS = marketsFile.markets;
export const MARKET_BY_SLUG = Object.fromEntries(MARKETS.map((m) => [m.slug, m]));

export const FUEL = fuelFile;
export const RATES = ratesFile;

export const SLANG_TERMS = slangFile.terms;
export const PSYCH_TERMS = slangFile.psychTerms;
export const SLANG_BY_SLUG = Object.fromEntries(SLANG_TERMS.map((t) => [t.slug, t]));
export const TRENDING_SLUGS = slangFile.trendingNow;
export const SLANG_OF_THE_DAY = slangFile.slangOfTheDay;

export const BLUEPRINTS = blueprintsFile.blueprints;
export type Blueprint = (typeof BLUEPRINTS)[number];
export const BLUEPRINT_BY_SLUG: Record<string, Blueprint> = Object.fromEntries(BLUEPRINTS.map((b) => [b.slug, b]));
export const CITY_FACTORS = blueprintsFile.cityFactors as Record<string, { label: string; multiplier: number; note: string }>;

export const GOV_DOCS = govhowtoFile.docs;
export const EXAM = examFile;
export const TELECOM = telecomFile;
export const RECIPES = recipesFile.recipes;
export const RECIPE_BY_SLUG: Record<string, (typeof RECIPES)[number]> = Object.fromEntries(RECIPES.map((r) => [r.slug, r]));
export const LEARN_TOPICS = learnFile.topics;
export const SPONSOR_CARDS = sponsorsFile.cards;

export const DATA_DATE = "9 October 2026";

/* ---------- prices ---------- */

export const bandMid = (b: Band) => (b[0] + b[1]) / 2;

/** Explicit dated band only. Missing city observations must stay unavailable rather than be interpolated. */
export function priceBand(itemSlug: string, citySlug: string): Band {
  const item = ITEM_BY_SLUG[itemSlug];
  const explicit = item && (item.prices as Record<string, number[]>)[citySlug];
  if (!explicit) throw new Error(`No explicit food-price observation for ${itemSlug}/${citySlug}`);
  return [explicit[0], explicit[1]];
}

/** Explicit dated 50kg bag observation only. */
export function bagPrice(citySlug: string): number {
  const bag = ITEM_BY_SLUG.rice.bag50kg as Record<string, number>;
  if (!bag[citySlug]) throw new Error(`No explicit rice-bag observation for ${citySlug}`);
  return bag[citySlug];
}

/** Monthly food basket for ONE adult at band midpoints. */
export function basketCost(citySlug: string): number {
  return BASKET.reduce((sum, b) => sum + bandMid(priceBand(b.item, citySlug)) * b.qty, 0);
}

/** Recipe cost per person (low / high) for a city, from per-person quantities. */
export function recipeCostPerPerson(recipeSlug: string, citySlug: string): Band {
  const r = RECIPE_BY_SLUG[recipeSlug];
  return r.ingredients.reduce<Band>(
    (acc, ing) => {
      const [lo, hi] = priceBand(ing.item, citySlug);
      return [acc[0] + lo * ing.qty, acc[1] + hi * ing.qty];
    },
    [0, 0],
  );
}

export function petrolPumpPrice(stateSlug: string): number | null {
  const row = FUEL.petrolPump.find((p) => p.slug === stateSlug);
  return row ? row.price : null;
}

/** Map a city to the state row used in the NNPC pump list. */
export function petrolForCity(citySlug: string): number | null {
  const map: Record<string, string> = { lagos: "lagos", abuja: "fct", aba: "abia", ibadan: "oyo", "port-harcourt": "rivers" };
  const key = map[citySlug];
  return key ? petrolPumpPrice(key) : null;
}

/* ---------- formatting ---------- */

export const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
export const nairaRange = (b: Band) => `${naira(b[0])} to ${naira(b[1])}`;
export const capWords = (n: number) => (n >= 1000000 ? `₦${n / 1000000} million` : `₦${n / 1000}k`);
export const capLabel = (n: number) => (n >= 1000000 ? `${n / 1000000}m` : `${n / 1000}k`);

export function cityRank(itemSlug: string, citySlug: string): number {
  const sorted = DIRECT_PRICE_CITIES.map((c) => ({ slug: c.slug, mid: bandMid(priceBand(itemSlug, c.slug)) })).sort((a, b) => a.mid - b.mid);
  return sorted.findIndex((c) => c.slug === citySlug) + 1;
}
