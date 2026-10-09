/**
 * NaijaCheck content seed script.
 *
 * Reads everything in /data and programmatically builds long-form article pages for every
 * dynamic route in the app. Outputs:
 *   - content/generated/articles.json  (imported by the app at build time)
 *   - public/search-index.json         (client-side search index)
 *
 * Run with: npm run generate  (also runs automatically before dev and build)
 *
 * Every article gets: unique meta title/description, H1, H2 sections, FAQs (for FAQPage schema),
 * takeaways, and 5-8 internal links to related pages.
 */
import fs from "node:fs";
import path from "node:path";
import cities from "../data/cities.json";
import marketsData from "../data/markets.json";
import prices from "../data/prices.json";
import fuel from "../data/fuel.json";
import slangData from "../data/slang.json";
import blueprintsData from "../data/blueprints.json";
import govhowto from "../data/govhowto.json";
import exam from "../data/exam.json";
import telecom from "../data/telecom.json";
import recipesData from "../data/recipes.json";
import learnData from "../data/learn.json";

type Section = { h2: string; paras: string[]; bullets?: string[] };
type Faq = { q: string; a: string };
type Link = { href: string; label: string };
export interface Article {
  path: string;
  section: string;
  navLabel: string;
  kicker: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  params: Record<string, string>;
  intro: string[];
  sections: Section[];
  faqs: Faq[];
  takeaways: string[];
  steps?: string[];
  links: Link[];
  wordCount: number;
  updatedAt: string;
  schemaType: "Article" | "HowTo";
}

type Draft = Omit<Article, "links" | "wordCount" | "updatedAt" | "schemaType"> & {
  linkPaths: string[];
  schemaType?: "Article" | "HowTo";
};

type City = (typeof cities.cities)[number];
type Item = (typeof prices.items)[number];
type Market = (typeof marketsData.markets)[number];
type Biz = (typeof blueprintsData.blueprints)[number];
type Recipe = (typeof recipesData.recipes)[number];
type Slang = (typeof slangData.terms)[number];
type Psych = (typeof slangData.psychTerms)[number];
type Doc = (typeof govhowto.docs)[number];
type Topic = (typeof learnData.topics)[number];
type Guide = (typeof exam.guides)[number];
type Institution = (typeof exam.institutions)[number];
type Network = (typeof telecom.networks)[number];

const UPDATED = prices.updatedAt;
const DATE_LABEL = "9 October 2026";

// ---------- helpers ----------
const fmt = (n: number) => "₦" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const range = (r: [number, number]) => `${fmt(r[0])} to ${fmt(r[1])}`;
const mid = (r: [number, number]) => (r[0] + r[1]) / 2;
const wordCount = (texts: string[]) => texts.join(" ").split(/\s+/).filter(Boolean).length;
const shortName = (name: string) => name.split("(")[0].trim();
const capLabel = (n: number) => (n >= 1000000 ? `${n / 1000000}m` : `${n / 1000}k`);
const capWords = (n: number) => (n >= 1000000 ? `₦${n / 1000000} million` : `₦${n / 1000}k`);

const CITY: Record<string, City> = Object.fromEntries(cities.cities.map((c) => [c.slug, c]));
const ITEM: Record<string, Item> = Object.fromEntries(prices.items.map((i) => [i.slug, i]));
const MARKET: Record<string, Market> = Object.fromEntries(marketsData.markets.map((m) => [m.slug, m]));
const BP: Record<string, Biz> = Object.fromEntries(blueprintsData.blueprints.map((b) => [b.slug, b]));
const RECIPE: Record<string, Recipe> = Object.fromEntries(recipesData.recipes.map((r) => [r.slug, r]));
const SLANG: Record<string, Slang> = Object.fromEntries(slangData.terms.map((t) => [t.slug, t]));
const DOC: Record<string, Doc> = Object.fromEntries(govhowto.docs.map((d) => [d.slug, d]));
const CORE_ITEMS = ["rice", "garri", "beans", "yam", "egg"];
const CITY_SLUGS = cities.cities.map((c) => c.slug);
const CITY_FACTORS = blueprintsData.cityFactors as Record<string, { label: string; multiplier: number; note: string }>;
const bizSlugs = blueprintsData.blueprints.map((b) => b.slug);

/** Price band for an item in a city. Explicit values where we have them, else Lagos scaled by costIndex. */
function priceFor(itemSlug: string, citySlug: string): [number, number] {
  const item = ITEM[itemSlug];
  const explicit = (item.prices as Record<string, number[]>)[citySlug];
  if (explicit) return [explicit[0], explicit[1]];
  const base = (item.prices as Record<string, number[]>).lagos;
  const f = CITY[citySlug].costIndex;
  return [Math.round((base[0] * f) / 10) * 10, Math.round((base[1] * f) / 10) * 10];
}
function bagFor(citySlug: string): number {
  const bag = (ITEM.rice as unknown as { bag50kg: Record<string, number> }).bag50kg;
  if (bag[citySlug]) return bag[citySlug];
  return Math.round((bag.lagos * CITY[citySlug].costIndex) / 100) * 100;
}
function basketCost(citySlug: string): number {
  return prices.basket.reduce((sum, b) => sum + mid(priceFor(b.item, citySlug)) * b.qty, 0);
}
function recipeCost(recipeSlug: string, citySlug: string, people: number): number {
  return RECIPE[recipeSlug].ingredients.reduce((sum, ing) => {
    if (!ITEM[ing.item]) return sum;
    return sum + mid(priceFor(ing.item, citySlug)) * ing.qty * people;
  }, 0);
}
function petrolFor(citySlug: string): number | null {
  const stateMap: Record<string, string> = { lagos: "lagos", abuja: "fct", aba: "abia", ibadan: "oyo", "port-harcourt": "rivers" };
  const key = stateMap[citySlug];
  if (!key) return null;
  const row = fuel.petrolPump.find((p) => p.slug === key);
  return row ? row.price : null;
}
function cityRanking(itemSlug: string): string[] {
  return [...CITY_SLUGS].sort((a, b) => mid(priceFor(itemSlug, a)) - mid(priceFor(itemSlug, b))).map((c) => CITY[c].name);
}
const rankOf = (itemSlug: string, citySlug: string) => cityRanking(itemSlug).indexOf(CITY[citySlug].name) + 1;
const marketsIn = (citySlug: string) => marketsData.markets.filter((m) => m.city === citySlug);
const recipesWith = (itemSlug: string) => recipesData.recipes.filter((r) => r.ingredients.some((i) => i.item === itemSlug));

const COMBOS = blueprintsData.blueprints.flatMap((b) =>
  ["lagos", "onitsha", "kano", "aba"].map((c) => ({ biz: b, city: c, slug: `${b.slug}-with-${capLabel(b.sampleCapital)}-in-${c}` }))
);
type Combo = (typeof COMBOS)[number];

const CATEGORY_WHY: Record<string, string[]> = {
  grains: ["Grains follow the harvest. Prices usually ease after the main harvest and climb in the lean season, roughly June to September.", "Transport from the North and the South-West adds cost fast, and a bad fuel week hits grain trucks just as hard as everyone else.", "Stock held by big traders matters too. When traders hoard during a shortage, the price jumps before the supply actually drops."],
  tubers: ["Yam is sensitive to rainfall and storage. A good harvest brings the price down, but poor storage means more spoilage and higher prices by the time it reaches the city.", "Transport is a big part of the price. Yam from the North or the South-East costs more to move, and that cost is passed to buyers.", "Size matters. A medium tuber and a big one can have very different per-kg costs, so always compare on weight."],
  protein: ["Protein prices track feed, cattle supply and dollar-linked costs. When feed or imported inputs cost more, poultry and eggs move up with them.", "Beef depends on cattle movement from the North. Insecurity and transport disruptions can push the price up quickly.", "Fish prices spike in rainy seasons and around festive periods, when demand is high and supply is tight."],
  vegetables: ["Vegetables are perishable, so prices swing with rainfall, transport time and how quickly they spoil in the market.", "A bad week of rain can double the price of tomatoes and pepper overnight. Good weeks bring relief.", "Local supply matters. Vegetables grown close to the city usually cost less than those that travel far."],
  oils: ["Palm oil prices depend on palm supply, import costs and the price of inputs. Gallon-size buys often beat the litre price.", "Quality varies a lot. Colour, smell and consistency tell you more than the label does.", "Palm oil is a big part of the soup budget, so a small price change adds up quickly across a month."],
  "soup-ingredients": ["Soup ingredients like egusi and okra are seasonal in many places. Off-season buys can cost more, and stock quality varies.", "Shelled and unshelled egusi have very different prices, so know what you are buying.", "Buy in bulk when the season is good, and store dry items properly to avoid spoilage."],
  groceries: ["Sugar prices follow import costs and brand competition. Brand matters more than the city.", "Buy the same brand every time so you can compare prices fairly.", "Large retail packs are cheaper per kg, but only if you use them before they go stale."],
};
const CATEGORY_BUY: Record<string, string[]> = {
  grains: ["Check for stones, weevils and wet patches before you pay for a whole bag.", "Ask for a sample and feel the grain. Broken grains mean lower quality.", "Keep dry goods off the floor and away from damp walls to stop spoilage."],
  tubers: ["Press the tuber. Soft spots and bruises mean early rot.", "Look at the cut ends. Dry, white flesh is good. Grey or dark spots are a warning.", "Buy only what you can use within two weeks unless you have good storage."],
  protein: ["Smell the meat and check the colour. Fresh meat should not be slimy or sour.", "Buy from a seller you trust and ask for a cold storage plan if you buy in bulk.", "Eggs: check for cracks and dirt, and keep them in a cool place."],
  vegetables: ["Choose firm, bright produce. Wilting and dark spots mean the item is old.", "Buy early in the day for the best selection. Late buys are cheaper but sometimes tired.", "Store tomatoes and pepper separately and use the fast-spoiling ones first."],
  oils: ["Check the seal and the colour. Dark, cloudy or sour-smelling oil is a red flag.", "Ask whether the oil is pure palm oil or mixed with other oils.", "Keep the container closed and out of direct sunlight."],
  "soup-ingredients": ["Check for mould, insects and off smells before you buy.", "Dry the ingredients properly if you store them, to prevent mould.", "Buy a small pack first if you are trying a new seller."],
  groceries: ["Check the expiry date on packaged goods.", "Buy from stores that rotate stock and keep shelves clean.", "Keep unopened packs in a dry cupboard away from heat."],
};

// ---------- builders ----------
const drafts: Draft[] = [];
const add = (d: Draft) => drafts.push(d);

function buildPriceCity(c: City) {
  const name = c.name;
  const core = CORE_ITEMS.map((s) => ({ item: ITEM[s], r: priceFor(s, c.slug) }));
  const bag = bagFor(c.slug);
  const petrol = petrolFor(c.slug);
  const stateRow = petrol
    ? `Pump petrol in ${c.state} was listed around ${fmt(petrol)} per litre in the latest NNPC retail list (9 October 2026).`
    : `${c.state} is not in our latest NNPC pump list, so check the nearest NNPC or private station before you plan your fuel budget.`;
  const sections: Section[] = [
    {
      h2: `Rice, garri, beans, yam and eggs in ${name} today`,
      paras: [
        `These are the five staples most ${name} households buy every week. The ranges below are indicative for ${DATE_LABEL}. They are planning numbers, not a receipt, and they should be checked against your own market visit before you commit a big budget.`,
        `Across the core five, the spread is wide. Rice is the biggest single cost, while eggs and garri are where small savings add up fastest over a month.`,
      ],
      bullets: core.map(({ item, r }) => `${item.name}: ${range(r)} (${item.unit}). ${item.note}`),
    },
    {
      h2: `The 50kg rice bag in ${name}`,
      paras: [
        `A 50kg bag of rice in ${name} is around ${fmt(bag)} in our indicative tracker. That works out to about ${fmt(bag / 50)} per kg before you add transport, storage and loss.`,
        `Buying a bag is only smart if you have dry storage and can use the rice within a few months. If you cannot, buy in smaller packs. Rice that gets damp goes sour and loses value quickly.`,
        `The national picture matters too. Lagos State's agriculture tracker reported a 50kg long-grain bag around ₦60,000 in mid-2026, and that is the benchmark most ${name} buyers are comparing against.`,
      ],
    },
    {
      h2: `Where to buy in ${name}`,
      paras: [`Markets are where ${name} prices are made. Here is where regulars go, and why.`],
      bullets: (c.markets as string[]).map((ms) => `${MARKET[ms].name}: ${MARKET[ms].known_for}. Tip: ${MARKET[ms].tip}`),
    },
    {
      h2: `How to stretch your naira in ${name}`,
      paras: [
        `${name} is ${c.vibe}. That means the smartest buyers are the ones who plan their week, not the ones who react to every price change.`,
        `Start with a shopping list written from your real meals, not your wishes. Then decide which items to buy in bulk and which to buy in small amounts.`,
      ],
      bullets: [
        "Buy staples in bulk once a month and fresh items weekly.",
        "Compare at least two sellers before buying a big bag or a crate of eggs.",
        "Set a weekly food cap and track it on your phone.",
        "Cook in batches and freeze what you can, but check your power plan first.",
        "Avoid buying on credit from the market unless you can repay on time.",
      ],
    },
    {
      h2: `Fuel, power and transport in ${name}`,
      paras: [
        stateRow,
        `Diesel is the key number for generator owners. The national median depot diesel price was ₦1,775 per litre on 6 October 2026, and Dangote's gantry diesel was ₦1,780 from 1 October. Pump and jerrycan diesel usually sits above depot prices, so budget for the gap.`,
        `Transport is often the biggest hidden cost in ${name}. Plan your trips, combine errands, and check the monthly transport budget in our cost-of-living calculator.`,
      ],
    },
    {
      h2: `How ${name} compares with other cities`,
      paras: [
        `Across our tracker, the cheapest city for rice is ${cityRanking("rice")[0]} and the most expensive is ${cityRanking("rice")[CITY_SLUGS.length - 1]}. ${name} ranks ${rankOf("rice", c.slug)} out of ${CITY_SLUGS.length} for rice.`,
        `For beans, ${name} ranks ${rankOf("beans", c.slug)} out of ${CITY_SLUGS.length}. For eggs, it ranks ${rankOf("egg", c.slug)}. Use these rankings to decide whether to buy in ${name} or travel to a cheaper market.`,
      ],
    },
    {
      h2: `What to do this week in ${name}`,
      paras: [`Use this checklist before your next market run. It keeps your budget steady and stops the most common overspending.`],
      bullets: [
        `Check the rice and beans range above and set a maximum you will pay.`,
        `Buy one staple in bulk and one in small packs so you can test prices.`,
        `Look at the cost-of-living calculator to see whether your monthly budget covers food and non-food costs.`,
        `Plan one cooking day for the week and buy only what that day needs.`,
      ],
    },
  ];
  const faqs: Faq[] = [
    { q: `What is the price of rice in ${name} today?`, a: `In our October 2026 indicative tracker, 1kg of rice in ${name} sits around ${range(priceFor("rice", c.slug))}. A 50kg bag is about ${fmt(bag)}. Confirm at the market before you buy.` },
    { q: `Where is the cheapest garri in ${name}?`, a: `Garri is usually cheapest close to where it is processed. In ${name}, check the wholesale clusters first, then compare with the nearest retail market. Our indicative range is ${range(priceFor("garri", c.slug))} per kg.` },
    { q: `How much are eggs in ${name} today?`, a: `Our tracker shows about ${range(priceFor("egg", c.slug))} per medium egg in ${name}. A crate of 30 is usually cheaper per egg, but check for cracks first.` },
    { q: `Is ${name} cheaper than Lagos for food?`, a: `${name} sits at ${rankOf("rice", c.slug)} out of ${CITY_SLUGS.length} for rice in our tracker. Cost of living also depends on rent and transport, so compare the whole budget, not just the food.` },
    { q: `Where can I check fuel prices in ${name}?`, a: `Our fuel page lists the latest pump and depot prices. For the most accurate number, check the nearest NNPC or private station before you fill up.` },
  ];
  add({
    path: `/prices/${c.slug}`, section: "prices-city", navLabel: `Food prices in ${name}`, kicker: `Prices · ${name}`,
    title: `Food Prices in ${name} Today: Rice, Garri, Beans, Yam & Eggs (2026)`,
    metaTitle: `${name} Food Prices Today 2026: Rice, Garri, Beans & Eggs`,
    metaDescription: `Rice, garri, beans, yam and egg prices in ${name} today, with the 50kg bag price, best markets, and tips to stretch your naira. Updated ${DATE_LABEL}.`,
    keywords: [`${name.toLowerCase()} food prices today`, `rice price in ${name.toLowerCase()} today`, `garri price ${name.toLowerCase()}`, `beans price ${name.toLowerCase()} 2026`],
    params: { city: c.slug },
    intro: [
      `If you are asking what food costs in ${name} today, the honest answer is: it depends on the market, the week, and whether you buy in bulk or by the kilo. ${name} is ${c.vibe}. This page gives you the price bands we are tracking for ${DATE_LABEL}, with the sources and caveats clearly marked.`,
      `Treat the numbers as a planning guide. Prices in ${name} move with the harvest, transport cost and dollar pressure. We update this page from our daily price file, and every range is labelled indicative until a market check confirms it.`,
    ],
    sections, faqs,
    takeaways: [`Rice in ${name}: ${range(priceFor("rice", c.slug))} per kg (indicative).`, `Eggs in ${name}: ${range(priceFor("egg", c.slug))} each.`, `Plan your week around the markets listed above, and compare two sellers before any bulk buy.`],
    linkPaths: [
      ...core.map(({ item }) => `/prices/${c.slug}/${item.slug}`),
      `/prices/cost-of-living`, `/prices/fuel`, `/tools/cookbook`, `/tools/generator`,
      `/hustle/provision-store-with-500k-in-${c.slug}`,
      ...(c.markets as string[]).slice(0, 2).map((ms) => `/prices/markets/${ms}`),
    ],
  });
}

function buildPriceItem(c: City, itemSlug: string) {
  const item = ITEM[itemSlug];
  const name = c.name;
  const sn = shortName(item.name).toLowerCase();
  const r = priceFor(itemSlug, c.slug);
  const m = mid(r);
  const monthlyFamily = m * (itemSlug === "egg" ? 60 : 5);
  const cats = CATEGORY_WHY[item.category] ?? CATEGORY_WHY.groceries;
  const buys = CATEGORY_BUY[item.category] ?? CATEGORY_BUY.groceries;
  const recs = recipesWith(itemSlug);
  const others = CORE_ITEMS.filter((s) => s !== itemSlug);
  const ranking = cityRanking(itemSlug);
  const sections: Section[] = [
    {
      h2: `${item.name} price in ${name} today`,
      paras: [
        `The indicative band for ${item.name.toLowerCase()} in ${name} is ${range(r)} ${item.unit}, with a midpoint of about ${fmt(m)}. This is a planning figure for ${DATE_LABEL}. ${item.note}`,
        `${name} ranks ${rankOf(itemSlug, c.slug)} out of ${CITY_SLUGS.length} cities in our tracker for this item. That ranking matters if you can shop across cities or buy in bulk.`,
      ],
    },
    { h2: `Why ${sn} moves in ${name}`, paras: cats },
    { h2: `How to buy ${sn} smartly in ${name}`, paras: [`Quality decides whether a cheap price is actually good value. These checks take two minutes and can save you a lot.`], bullets: buys },
    {
      h2: `Where to buy in ${name}`,
      paras: [`The markets below are where ${name} regulars shop for this item. Go early for the best selection.`],
      bullets: (c.markets as string[]).map((ms) => `${MARKET[ms].name}: ${MARKET[ms].known_for}. ${MARKET[ms].tip}`),
    },
    {
      h2: `What it costs over a month`,
      paras: [
        `A typical month for a family of four might use around ${itemSlug === "egg" ? "60 eggs" : "5kg"} of ${sn} at ${name}'s midpoint, which comes to about ${fmt(monthlyFamily)}. Adjust the quantity to your own usage and check the cost-of-living calculator for the full budget.`,
        `If you buy weekly instead of monthly, you may pay a little more per unit, but you also reduce waste. The right answer depends on your storage space and how fast your household uses it up.`,
      ],
    },
    {
      h2: `Recipes that use ${sn}`,
      paras: recs.length
        ? [`Here are the recipes in our cookbook that use this item. Each recipe page calculates the cost for your family size using the same price file.`]
        : [`This item is not a core ingredient in our current cookbook, but it still plays a role in many household budgets.`],
      bullets: recs.map((rec) => `${rec.name}: ${rec.servesNote}`),
    },
    {
      h2: `${name} against other cities`,
      paras: [`The cheapest city for ${item.name.toLowerCase()} in our tracker is ${ranking[0]}. The most expensive is ${ranking[ranking.length - 1]}. Compare before a big buy, especially if you have a truck or a reliable transporter.`],
      bullets: CITY_SLUGS.map((cs) => `${CITY[cs].name}: ${range(priceFor(itemSlug, cs))}`),
    },
  ];
  const faqs: Faq[] = [
    { q: `How much is ${sn} in ${name} today?`, a: `Our indicative band is ${range(r)} ${item.unit}. Check the market before you buy because prices move weekly.` },
    { q: `Why did ${sn} get expensive in ${name}?`, a: cats[0] },
    { q: `Where is the best place to buy ${sn} in ${name}?`, a: `${(c.markets as string[]).map((ms) => MARKET[ms].name).join(" and ")} are the main options in our tracker. Compare two sellers before you buy in bulk.` },
    { q: `Is buying in bulk cheaper for ${sn}?`, a: `Usually yes per unit, if you can store it safely and use it within the shelf life. If you cannot, buy small amounts and avoid waste.` },
  ];
  add({
    path: `/prices/${c.slug}/${itemSlug}`, section: "prices-item", navLabel: `${shortName(item.name)} price in ${name}`, kicker: `Prices · ${name} · ${shortName(item.name)}`,
    title: `${shortName(item.name)} Price in ${name} Today (2026 Guide)`,
    metaTitle: `${shortName(item.name)} Price in ${name} Today 2026`,
    metaDescription: `${shortName(item.name)} price in ${name} today: ${range(r)} ${item.unit}. Where to buy, why it moves, and how to save. Updated ${DATE_LABEL}.`,
    keywords: [`${itemSlug} price in ${name.toLowerCase()} today`, `${itemSlug} price ${name.toLowerCase()} 2026`],
    params: { city: c.slug, item: itemSlug },
    intro: [
      `Looking for the ${sn} price in ${name} today? Our indicative band is ${range(r)} ${item.unit}. This page explains why that number moves, where to buy, and how to avoid overpaying.`,
      `Prices are updated from our daily file. Where we have not yet verified a number with a market check, we say so. Use this page with the city overview and the cost-of-living calculator to plan your month.`,
    ],
    sections, faqs,
    takeaways: [`${shortName(item.name)} in ${name}: ${range(r)} ${item.unit} (indicative).`, `Buy from the markets listed and compare two sellers.`, `Check quality before you pay for a bulk buy.`],
    linkPaths: [
      `/prices/${c.slug}`, ...others.map((o) => `/prices/${c.slug}/${o}`),
      ...recs.slice(0, 2).map((rec) => `/tools/cookbook/${rec.slug}`),
      `/prices/cost-of-living`, `/prices/markets`,
    ],
  });
}

function buildPriceMarket(m: Market) {
  const c = CITY[m.city];
  const sections: Section[] = [
    { h2: `What ${m.name} is known for`, paras: [`${m.name} in ${c.name} is best known for ${m.known_for}. Regulars come for the variety, the wholesale prices and the speed of the trade.`, `Prices here follow the ${c.name} citywide pattern, with local swings. Our indicative citywide rice band is ${range(priceFor("rice", c.slug))} per kg.`] },
    { h2: `Insider tips for ${m.name}`, paras: [m.tip, `Bring small notes, carry a bag that is easy to carry, and know your basic price list before you walk in. First prices are usually opening numbers, not final ones.`] },
    { h2: `How to plan a visit`, paras: [`Plan your route, set a budget for the trip, and stick to the list you wrote before you left. Go early for the best stock and check the weather, because heavy rain slows down the trucks and can change prices for a few days.`], bullets: ["Arrive before 9am for the widest choice.", "Carry cash in small notes and keep it split between pockets.", "Compare the same item at two sellers before you buy.", "Take a photo of the price list so you can compare next time.", "Ask about bulk discounts before you pay for a full bag."] },
    { h2: `Prices to check at ${m.name}`, paras: [`These are the core items most ${c.name} households buy. Use them as a benchmark when you walk the market.`], bullets: CORE_ITEMS.map((s) => `${ITEM[s].name}: ${range(priceFor(s, c.slug))} ${ITEM[s].unit} (indicative)`) },
    { h2: `Who should shop here`, paras: [`Market shopping suits households buying in bulk, small traders restocking, and anyone who wants the best value on fresh and dry goods. It is less suited to people who need a single item in a hurry, unless they live close by.`] },
  ];
  const faqs: Faq[] = [
    { q: `Is ${m.name} the cheapest market in ${c.name}?`, a: `It is one of the strongest options for bulk buys, but cheapest depends on the item and the week. Compare with another market before a big purchase.` },
    { q: `What time is best to shop at ${m.name}?`, a: `Early morning gives the best choice and fresher produce. Late afternoon can bring discounts on perishables, but the choice is smaller.` },
    { q: `How do I avoid being overcharged at ${m.name}?`, a: `Know the basic price list, ask for the price before you ask for a bag, and do not pay for goods you have not inspected.` },
  ];
  add({
    path: `/prices/markets/${m.slug}`, section: "prices-market", navLabel: m.name, kicker: `Markets · ${c.name}`,
    title: `${m.name}: Prices, Tips and What to Buy (${c.name}, 2026)`,
    metaTitle: `${m.name} Prices & Tips 2026 | ${c.name}`,
    metaDescription: `${m.name} in ${c.name}: what it is known for, indicative food prices, insider tips and the best time to shop in 2026.`,
    keywords: [`${m.name.toLowerCase()} prices`, `${c.name.toLowerCase()} market prices 2026`],
    params: { market: m.slug },
    intro: [
      `${m.name} is one of the places ${c.name} buyers go when they want value. This guide tells you what to buy there, what to expect on price, and how to avoid the mistakes that make a market trip more expensive than it should be.`,
      `Price bands are indicative for ${DATE_LABEL}. Check the market on the day, and use our city page for the wider picture.`,
    ],
    sections, faqs,
    takeaways: [m.tip, `Compare with ${c.name}'s other markets before a big buy.`],
    linkPaths: [`/prices/${c.slug}`, `/prices/${c.slug}/rice`, `/prices/${c.slug}/beans`, ...marketsIn(c.slug).filter((x) => x.slug !== m.slug).map((x) => `/prices/markets/${x.slug}`), `/prices/cost-of-living`, `/tools/cookbook`],
  });
}

function buildPricesHubs() {
  add({
    path: "/prices", section: "hub", navLabel: "Prices hub", kicker: "Prices",
    title: "Daily Prices: Food, Fuel, Dollar Rate and Cost of Living",
    metaTitle: "Daily Naija Prices 2026: Food, Fuel & Dollar Rate | NaijaCheck",
    metaDescription: "Daily Naija prices in one place: food in 10 cities, petrol and diesel, black market dollar, and a cost-of-living calculator. Updated daily.",
    keywords: ["naija prices today", "food prices nigeria 2026", "current black market dollar rate", "petrol price today nigeria"],
    params: {},
    intro: [
      `Prices in Nigeria change fast. Rice can move in a week, petrol can move in a day, and the dollar can shift before your lunch break. NaijaCheck's prices section is built to answer the question you actually ask: what will this cost me today, in my city?`,
      `Every number on this site is labelled with its date and status. Where a figure comes from a published source, we cite it. Where it is an editor's indicative estimate, we say so. Nothing here is a guarantee, so always check the market before you commit a big budget.`,
    ],
    sections: [
      { h2: "What we track every day", paras: ["We track 17 everyday items in 10 cities: the staples (rice, garri, beans, yam, eggs), protein, vegetables, oils, soup ingredients and groceries. We also track petrol, diesel, depot prices and the naira's official and black market rates."], bullets: ["Food: 17 items across 10 cities", "Fuel: petrol pump prices by state and depot diesel", "FX: official and black market USD, GBP and EUR", "Cost of living: a calculator for your monthly budget"] },
      { h2: "Fuel and diesel right now", paras: [`Pump petrol in Lagos was listed at ₦1,355 per litre on the NNPC list of 9 October 2026, and Abuja at ₦1,370. Dangote's gantry petrol price was ₦1,325. Diesel is the bigger story for generator owners: Dangote cut its gantry diesel to ₦1,780 on 1 October 2026, while several Lagos depots were selling between ₦1,795 and ₦1,890.`] },
      { h2: "The dollar and the naira", paras: [`The CBN official rate was about ₦1,331.77 to the dollar in early October 2026, while the black market rate was about ₦1,370. The gap is a key signal for importers, students paying school fees abroad, and anyone with dollar-linked costs.`, `We publish both because the gap matters. A bigger gap usually means more pressure on imported goods, phones and fuel inputs.`] },
      { h2: "Cities we cover", paras: ["Our food tracker covers Lagos, Onitsha, Kano, Aba, Abuja, Ibadan, Port Harcourt, Enugu, Kaduna and Benin City. Each city page has the core five staples, the best markets, and tips for stretching your money."] },
      { h2: "How to use this section", paras: ["Start with your city page for the broad picture. Then open the item page for the staple you buy most. Use the cost-of-living calculator to test your monthly budget, and the cookbook to see what your favourite dish will cost for your family."] },
    ],
    faqs: [
      { q: "How often are prices updated?", a: "The price files are reviewed daily. Each page shows the update date. Figures that are not yet market-verified are marked as indicative." },
      { q: "Where do the dollar rates come from?", a: "Our USD figures come from published aggregator reports on 1 to 9 October 2026. GBP and EUR are derived from USD cross rates until we connect a dedicated feed." },
      { q: "Are the food prices exact?", a: "No. They are ranges for planning. Confirm with the market before a big purchase." },
    ],
    takeaways: ["Check your city page first.", "Watch diesel if you run a generator.", "Use the calculator to test your monthly budget."],
    linkPaths: ["/prices/lagos", "/prices/onitsha", "/prices/kano", "/prices/aba", "/prices/fuel", "/prices/cost-of-living", "/prices/markets", "/tools/cookbook", "/tools/generator", "/hustle"],
  });
  add({
    path: "/prices/fuel", section: "prices-static", navLabel: "Fuel prices today", kicker: "Prices · Fuel",
    title: "Petrol and Diesel Prices Today in Nigeria (October 2026)",
    metaTitle: "Petrol & Diesel Price Today Nigeria (Oct 2026) | NaijaCheck",
    metaDescription: "Petrol pump prices by state (NNPC list), Dangote gantry prices, depot diesel and LPG, with sources and dates. Updated 9 October 2026.",
    keywords: ["petrol price today nigeria", "diesel price today nigeria", "NNPC petrol price lagos", "dangote petrol price"],
    params: {},
    intro: [
      `Fuel is the most-searched price in Nigeria, and for good reason. Every trip, every generator and every delivery depends on it. This page brings together the latest NNPC pump list, Dangote's gantry prices and depot medians, with the date and source for each number.`,
      `Pump prices vary by state and by station. Depot prices are wholesale and do not include the margin you pay at the pump. Read the table with that in mind.`,
    ],
    sections: [
      { h2: "Petrol pump prices by state", paras: ["These are the NNPC retail prices reported on 9 October 2026. Prices change without much notice, so confirm at the station."], bullets: fuel.petrolPump.map((p) => `${p.state}: ${fmt(p.price)} per litre`) },
      { h2: "Depot and gantry prices", paras: ["Depot and gantry prices are the wholesale numbers that feed into pump prices. They move before the pump does, so they are useful as an early warning."], bullets: fuel.depots.map((d) => (d.range ? `${d.name}: ${fmt(d.range[0])} to ${fmt(d.range[1])} per litre (${d.date})` : `${d.name}: ${fmt(d.price as number)} per litre (${d.date})`)) },
      { h2: "What the numbers mean for you", paras: [fuel.dieselNote, "If you are a car owner, compare the pump price with your monthly fuel use. If you are a generator owner, use the generator calculator to turn the diesel price into a daily and monthly cost."] },
    ],
    faqs: [
      { q: "What is the petrol price in Lagos today?", a: "The NNPC list reported ₦1,355 per litre in Lagos on 9 October 2026. Check the station before you buy." },
      { q: "Why is diesel more expensive than petrol?", a: "Diesel has its own supply chain and demand. In the depot data, diesel sits well above petrol, which matters for generator owners." },
      { q: "Where do these prices come from?", a: "They come from the sources listed on the page: NNPC retail lists, Dangote gantry announcements, and published depot medians." },
    ],
    takeaways: ["Lagos petrol: ₦1,355 per litre on the NNPC list (9 Oct 2026).", "Dangote diesel gantry: ₦1,780 (1 Oct 2026).", "Use the generator calculator to turn diesel into a monthly budget."],
    linkPaths: ["/tools/generator", "/tools/solar", "/prices/generator-diesel", "/prices/cost-of-living", "/prices/lagos", "/learn/electricity-bill-explained", "/prices", "/telecom"],
  });
  add({
    path: "/prices/generator-diesel", section: "prices-static", navLabel: "Generator diesel prices", kicker: "Prices · Diesel",
    title: "Generator Diesel Price Guide 2026: Depot, Pump and What It Costs You",
    metaTitle: "Generator Diesel Price 2026 Nigeria: Depot & Pump Guide",
    metaDescription: "Diesel price guide for generator owners: Dangote gantry, Lagos depots, the national median, and how to budget a month of generator fuel.",
    keywords: ["diesel price today nigeria", "generator diesel cost per day nigeria", "AGO price nigeria 2026"],
    params: {},
    intro: [
      `If you run a generator in Nigeria, diesel is probably your biggest monthly bill after rent. This guide shows you the wholesale numbers that matter, how pump diesel differs, and how to build a simple budget that does not surprise you.`,
      `Figures are from 1 to 9 October 2026. Diesel is volatile, so check the depot price on your planning day, not last month's number.`,
    ],
    sections: [
      { h2: "Current diesel benchmarks", paras: [`Dangote Refinery cut its gantry diesel price to ₦1,780 per litre effective 1 October 2026, from ₦1,850. Several Lagos depots were quoting between ₦1,795 and ₦1,890. The national median depot price was ₦1,775 per litre on 6 October.`], bullets: fuel.depots.filter((d) => d.product === "diesel").map((d) => d.name) },
      { h2: "Why pump diesel costs more", paras: ["Wholesale depot prices are not what you pay at the pump. Retail margins, transport and station costs add to the number. The gap changes by station and by week."] },
      { h2: "How much diesel does a generator use?", paras: ["Consumption depends on the generator's size, the load and how well it is serviced. As a rough rule for planning, a generator at half load burns a few litres an hour. Use the generator calculator to get a number for your own load, and always test with your own machine's manual."] },
      { h2: "Ways to cut generator diesel costs", paras: ["Shift heavy appliances to the times when power is available. Service your generator on schedule so it burns fuel efficiently. Consider a solar and inverter system if your daily run-time is high and the payback works for you."], bullets: ["Run a load audit: list every appliance and its wattage.", "Switch off standby devices and use LED lighting.", "Service filters and oil on schedule.", "Calculate payback on solar before you buy."] },
    ],
    faqs: [
      { q: "What is the diesel price today in Nigeria?", a: "The Dangote gantry price was ₦1,780 per litre from 1 October 2026. Depot ranges and pump prices can be higher." },
      { q: "How much diesel does a generator use per day?", a: "It depends on load and size. Use the generator calculator to estimate your daily and monthly use." },
      { q: "Is solar cheaper than diesel?", a: "It depends on your daily hours and your system cost. Use the solar payback calculator to test your case." },
    ],
    takeaways: ["Dangote diesel: ₦1,780 per litre (1 Oct 2026).", "Budget for the gap between depot and pump.", "Test solar payback before you commit."],
    linkPaths: ["/tools/generator", "/tools/solar", "/prices/fuel", "/prices/cost-of-living", "/hustle/generator-service", "/learn/electricity-bill-explained", "/prices/lagos", "/prices"],
  });
  add({
    path: "/prices/cost-of-living", section: "prices-static", navLabel: "Cost-of-living calculator", kicker: "Prices · Cost of living",
    title: "How Far Will ₦80k Go in Lagos This Month? Cost-of-Living Calculator",
    metaTitle: "How Far Will ₦80k Go in Lagos? Cost of Living Calculator 2026",
    metaDescription: "Use the NaijaCheck calculator to see how far ₦80k goes in Lagos and other cities: food basket, data, transport and power, with household sizes.",
    keywords: ["how far will 80k go in lagos", "cost of living lagos 2026", "monthly budget nigeria 2026", "80k salary lagos"],
    params: {},
    intro: [
      `The question everyone asks in Lagos is simple: how far will my money go this month? This calculator answers it with a monthly food basket, a set of non-food estimates, and the city multiplier applied to real price bands.`,
      `Enter your budget, city and household size. The calculator shows what the food basket costs, what is left for transport, power and data, and where you may be short.`,
    ],
    sections: [
      { h2: "How the calculator works", paras: ["The calculator prices a monthly food basket for one adult: rice, beans, garri, yam, eggs, palm oil, tomatoes, pepper, onions, chicken, fish and sugar. It uses the midpoint of each price band in your city, scales the household by size, and then subtracts the non-food estimates."], bullets: prices.monthlyNonFoodEstimates.map((e) => `${e.label}: about ${fmt(e.amount)} per month`) },
      { h2: "What ₦80k covers in Lagos", paras: [`For one adult in Lagos, the monthly food basket costs about ${fmt(basketCost("lagos"))} at the midpoint of our indicative bands. That leaves very little for transport, data and power unless you cook at home and walk short distances.`, `This is why many Lagos workers say ₦80k is tight. It can work if you share a room, cook most meals, and keep transport tight. It usually does not work if you live alone and pay rent from the same budget.`] },
      { h2: "Comparing cities", paras: [`Across our tracker, the monthly food basket for one adult costs about ${fmt(basketCost("kano"))} in Kano and about ${fmt(basketCost("aba"))} in Aba, at the midpoint of our bands. Use the city selector in the calculator to test your own city.`] },
      { h2: "Rules to protect your budget", paras: ["Set your non-negotiables first: transport, data and power. Then set a weekly food cap. Keep a small emergency buffer, and do not borrow to fund owanbe or shakara you cannot repay."], bullets: ["Pay your fixed costs on day one.", "Shop from a list and stick to it.", "Use a weekly cash envelope.", "Track every naira on your phone for 30 days."] },
    ],
    faqs: [
      { q: "How far does ₦80k go in Lagos?", a: "It depends on rent, transport and whether you cook. The calculator shows what food costs, and what is left for the rest." },
      { q: "Is the calculator exact?", a: "No. It uses indicative price bands and estimates. It is designed to help you plan, not to replace your own records." },
      { q: "Does the calculator include rent?", a: "No. Rent varies too much to estimate fairly. Subtract your rent from your budget before you use the result." },
    ],
    takeaways: ["Food is the biggest cost for most households.", "Subtract rent before you plan the rest.", "Test different cities to see where your money goes furthest."],
    linkPaths: ["/learn/budget-80k", "/tools/cookbook", "/prices/lagos", "/prices/kano", "/prices/fuel", "/hustle/provision-store", "/learn/small-money-side-hustles", "/prices"],
  });
  add({
    path: "/prices/markets", section: "hub", navLabel: "Markets directory", kicker: "Prices · Markets",
    title: "Nigeria's Biggest Markets: Where to Buy, What Things Cost, and Tips",
    metaTitle: "Nigeria Markets Guide 2026: Best Places to Buy Food & Goods",
    metaDescription: "A directory of the biggest markets in Lagos, Onitsha, Kano, Aba, Abuja, Ibadan, Port Harcourt, Enugu, Kaduna and Benin City, with tips for buyers.",
    keywords: ["best market to buy rice in lagos", "onitsha main market prices", "kantin kwari market guide"],
    params: {},
    intro: [
      `Markets set the real prices in Nigeria. Supermarkets have their place, but for bulk buys, fresh produce and wholesale goods, the big markets are where most households and traders shop.`,
      `This directory lists the markets we cover, what each is known for, and how to plan a visit so you get more for your money.`,
    ],
    sections: [
      { h2: "Markets we cover", paras: ["Each market page gives you a short guide, the core price benchmarks for its city, and the tips that regular buyers use."], bullets: marketsData.markets.map((m) => `${m.name} (${CITY[m.city].name}): ${m.known_for}`) },
      { h2: "How to shop a market without getting ripped off", paras: ["Know the basic price list before you walk in. Ask for the price first, compare two sellers, and inspect the goods before you pay. Bulk buys usually come with better unit prices, but only if you can store and use the items."] },
    ],
    faqs: [
      { q: "Which market is cheapest for rice?", a: "It depends on the city and the week. Compare the city pages for indicative bands, then check two markets before a bulk buy." },
      { q: "Is it safe to carry cash to a market?", a: "Carry only what you need, split it across pockets, and avoid flashing money." },
      { q: "Do markets accept transfers?", a: "Many do now, but some sellers still prefer cash. Confirm before you walk in." },
    ],
    takeaways: ["Go early for the best choice.", "Compare two sellers before any bulk buy.", "Use city pages for the price benchmark."],
    linkPaths: ["/prices/lagos", "/prices/onitsha", "/prices/kano", "/prices/aba", "/prices/abuja", "/prices/markets/mile-12", "/prices/markets/onitsha-main-market", "/prices/markets/kantin-kwari"],
  });
}

function buildTrendsSlang(t: Slang) {
  const biz = BP[t.relatedHustle];
  const sections: Section[] = [
    { h2: `What ${t.term} means`, paras: [t.meaning, t.detail] },
    { h2: `Where ${t.term} came from and where it lives online`, paras: [`Platform: ${t.platform}. ${t.source}`, `Confidence level for this definition: ${t.confidence}. Slang changes fast, and some terms carry different meanings in different groups. When in doubt, ask the person you are talking to.`] },
    { h2: `How to use ${t.term} in a sentence`, paras: [`Here are real-life style examples, in the tone you will hear on the street, in WhatsApp and online.`], bullets: t.examples },
    { h2: `Why ${t.term} is trending in 2026`, paras: [`Our trend index for ${t.term} is ${t.trendScore} out of 100, with a status of ${t.trend}. That index is an editorial score from our weekly review of public trend coverage, creator explainers and search interest. It is not an automated feed.`, `Trends like this peak around specific moments: a song release, a festive season, or a viral video. Watch for those moments and you will see the term move before it becomes common.`] },
    { h2: `Where the money is in this trend`, paras: [`This term connects to a real business idea. If the word is hot, there are people buying and selling around it. Our ${biz ? biz.name : "hustle"} blueprint shows the capital, licences and steps if you want to test the idea.`] },
    { h2: `Mistakes people make with ${t.term}`, paras: ["Most slang mistakes come from using a term in the wrong setting. The safe rule: match the energy of the room, avoid using slang at formal events, and never use it to mock someone's background."], bullets: ["Using it in a job interview or a formal email.", "Assuming everyone uses the same meaning.", "Using it to insult someone without knowing the context.", "Letting the trend pull you into spending you cannot afford."] },
  ];
  const faqs: Faq[] = [
    { q: `What does ${t.term} mean in 2026?`, a: t.meaning },
    { q: `Is ${t.term} safe to use at work?`, a: "Use it only with colleagues who already use it. In formal writing, use plain English." },
    { q: `Where did ${t.term} start?`, a: t.source },
    { q: `How is ${t.term} used in a sentence?`, a: `Example: "${t.examples[0]}"` },
  ];
  const bizCombo = `/hustle/${t.relatedHustle}-with-${capLabel(biz ? biz.sampleCapital : 200000)}-in-lagos`;
  add({
    path: `/trends/${t.slug}`, section: "trends-slang", navLabel: `${t.term} meaning`, kicker: `Trends · ${t.kind === "trend" ? "Trend" : "Slang"}`,
    title: `${t.term} Meaning 2026: What It Means and How to Use It`,
    metaTitle: `${t.term} Meaning 2026: Naija Slang Explained`,
    metaDescription: `${t.term} meaning in 2026: ${t.meaning} Examples, origin, why it's trending, and where the money is.`,
    keywords: [`${t.term.toLowerCase()} meaning 2026`, `meaning of ${t.slug.replace(/-/g, " ")}`],
    params: { slug: t.slug },
    intro: [
      `If you have heard ${t.term} and are not sure what it means, you are not alone. ${t.meaning} This page breaks down the meaning, where it came from, how people use it, and what it means for your money.`,
      `Slang moves fast, so we keep each entry updated and label our confidence level. Use this as a practical guide, not a dictionary of final answers.`,
    ],
    sections, faqs,
    takeaways: [t.meaning, `Trend index: ${t.trendScore}/100 (${t.trend}).`, `Related: ${biz ? biz.name : "a hustle idea"} on NaijaCheck.`],
    linkPaths: [`/hustle/${t.relatedHustle}`, ...t.relatedSlang.map((s) => `/trends/${s}`), "/trends", bizCombo, "/tools/cookbook", "/learn/small-money-side-hustles"],
  });
}

function buildTrendsPsych(t: Psych) {
  const sections: Section[] = [
    { h2: `What ${t.term.toLowerCase()} means`, paras: [t.meaning, `It can happen in marriages, dating, friendships, families and workplaces. In Nigeria, family pressure and money often make it harder to spot, because people are trained to respect elders and keep the peace.`] },
    { h2: "Signs to watch for", paras: ["These are patterns, not diagnoses. One bad day does not make a pattern. Repeated behaviour over time is what matters."], bullets: t.signs },
    { h2: "How it shows up in Naija relationships", paras: ["These examples are common enough that many readers will recognise them. They are written to help you name what is happening, not to judge anyone."], bullets: t.naijaExamples },
    { h2: "What you can do about it", paras: ["Naming a pattern is the first step. Protecting your money, your time and your support system comes next. Keep records, talk to people outside the situation, and get professional help when things feel unsafe."], bullets: t.whatToDo },
    { h2: "Why it's trending", paras: [`Our trend index for this topic is ${t.trendScore}/100. More people are using clear language about relationships and mental health, and that makes these terms easier to search and share.`] },
    { h2: "When to get help", paras: ["If you feel unsafe, threatened or are being hurt, contact local emergency services or a trusted support line right away. For emotional support, a counsellor or therapist can help you work through the pattern at your pace. This page is general information and not medical or legal advice."] },
  ];
  const faqs: Faq[] = [
    { q: `What is ${t.term.toLowerCase()}?`, a: t.meaning },
    { q: `How do I know if I'm experiencing ${t.term.toLowerCase()}?`, a: "Look for repeated patterns over time. If you feel confused, anxious or constantly doubting yourself, talk to someone you trust." },
    { q: "Where can I get help?", a: "Start with a trusted friend, a faith leader if that works for you, or a professional counsellor. For immediate danger, contact emergency services." },
  ];
  const bizSlug = BP[t.relatedHustle] ? t.relatedHustle : "home-baking";
  add({
    path: `/trends/${t.slug}`, section: "trends-psych", navLabel: t.term, kicker: "Trends · Relationships",
    title: `${t.term}: Signs, Naija Examples and What to Do`,
    metaTitle: `${t.term}: Signs & Naija Examples | NaijaCheck`,
    metaDescription: `${t.term} explained with signs, real Naija examples and practical steps to protect yourself. General information, not medical advice.`,
    keywords: [t.slug.replace(/-/g, " "), `${t.slug.replace(/-/g, " ")} signs`],
    params: { slug: t.slug },
    intro: [
      `${t.meaning} This guide explains the signs, gives examples from Naija relationships and families, and lists practical steps you can take.`,
      `This is general information, not medical or legal advice. If you are in danger, please contact local emergency services first.`,
    ],
    sections, faqs,
    takeaways: t.whatToDo,
    linkPaths: [`/trends/${t.relatedSlang[0] ?? "gbese"}`, `/hustle/${bizSlug}-with-${capLabel(BP[bizSlug].sampleCapital)}-in-lagos`, "/trends", "/learn/budget-80k", "/learn/spot-fake-job-offers", "/prices/cost-of-living", "/hustle"],
  });
}

function buildTrendsHub() {
  add({
    path: "/trends", section: "hub", navLabel: "Trends hub", kicker: "Trends",
    title: "Naija Slang Decoder and Trend Monitor (2026)",
    metaTitle: "Naija Slang Decoder 2026: Meanings, Trends & Examples",
    metaDescription: "Decode Naija slang in 2026: Kelebu, Oblee, Achalugo, Sope Purr, Japa and more, plus relationship terms like gaslighting with local examples.",
    keywords: ["meaning of kelebu 2026", "oblee meaning", "achalugo meaning", "sope purr meaning", "naija slang 2026"],
    params: {},
    intro: [
      `Nigerian slang moves faster than dictionaries. One song or one video can make a word the entire country is saying in a week. NaijaCheck's decoder tracks the terms people are searching for, explains where they come from, and gives you examples you can actually use.`,
      `We also cover the relationship and mental health terms that show up in Naija homes and dating circles, because words are how we name what is happening to us.`,
    ],
    sections: [
      { h2: "How we monitor trends", paras: ["Our trend index is an editorial score from a weekly review of public coverage, creator explainers and search interest. We do not run automated scraping on social platforms. When we are not sure about a meaning, we say so and show our confidence level on the page."], bullets: ["Weekly review of public trend coverage", "Explainer videos and articles from creators and newsrooms", "Search interest signals from public sources", "Confidence labels on every entry"] },
      { h2: "How to use the decoder", paras: ["Search for the word you heard. Each entry explains the meaning, origin, example sentences, why it is trending, and any money angle connected to the trend. Relationship terms come with signs, real examples, and practical steps."] },
      { h2: "Trending right now", paras: [`Kelebu (trend index 96), Oblee (91), Sope Purr (88) and Achalugo (78) are among the highest-scoring terms in our October 2026 review. Demure Naija (82) and Labubu (85) are the trend formats most likely to turn into business ideas.`] },
    ],
    faqs: [
      { q: "What does kelebu mean in 2026?", a: "Kelebu is tied to Rema's 2026 song and dance. Online explainers treat it as a comeback or 'spiritual shift' declaration. Read the entry for detail." },
      { q: "Is the slang decoder updated daily?", a: "The slang list is reviewed weekly, and the trend-of-the-day is refreshed when the editor updates the data file." },
      { q: "Can I suggest a term?", a: "Yes. Use the contact details on the about page and tell us the term, how you use it, and where it comes from." },
    ],
    takeaways: ["Kelebu and Oblee are the top trends right now.", "Relationship terms come with real Naija examples.", "Every entry shows its confidence level."],
    linkPaths: ["/trends/kelebu", "/trends/oblee", "/trends/achalugo", "/trends/sope-purr", "/trends/gaslighting-in-naija-relationships", "/trends/labubu-in-nigeria", "/hustle", "/tools/cookbook"],
  });
}

function buildHustleHub() {
  add({
    path: "/hustle", section: "hub", navLabel: "Hustle blueprints", kicker: "Hustle",
    title: "Hustle Blueprints for Nigeria: How to Start a Business With Real Numbers",
    metaTitle: "Hustle Blueprints Nigeria 2026: Start a Business With Real Numbers",
    metaDescription: "Hustle blueprints for Nigerians: POS, provision store, suya, thrift fashion, phone accessories, laundry, generator service and home baking. CAC, NAFDAC and costs.",
    keywords: ["how to start pos business with 200k in lagos", "business ideas with 200k nigeria", "small business ideas lagos 2026", "start a business in nigeria 2026"],
    params: {},
    intro: [
      `Most Nigerian hustle advice is either too vague or too expensive. This section gives you blueprints with real numbers: capital ranges, startup budgets, monthly costs, registration steps, and the failure points that close businesses in their first year.`,
      `Each blueprint is a planning guide. Costs are estimates for October 2026. Confirm them with suppliers and official portals before you commit money.`,
    ],
    sections: [
      { h2: "How to choose the right hustle", paras: ["Start with what you can sell and what you can afford to lose. Then test demand before you buy stock. The best hustle is usually the one that uses a skill you already have and fits your capital."], bullets: ["Match the capital to the business. Do not stretch to a ₦2m plan with ₦150k.", "Check that the business has a steady customer base near you.", "Plan your registration: CAC, TIN and any permits.", "Keep a daily ledger from day one."] },
      { h2: "The eight blueprints we cover", paras: ["Here are the business models in our blueprint library, with the capital they usually need."], bullets: blueprintsData.blueprints.map((b) => `${b.name}: ${capWords(b.capitalMin)} to ${capWords(b.capitalMax)}`) },
      { h2: "Free vs premium", paras: ["The free plan gives you the top three matches, a startup budget breakdown and a 90-day outline. The premium plan adds a detailed PDF-style plan, supplier directions, a registration checklist and 2026 cost updates."] },
    ],
    faqs: [
      { q: "How do I start a POS business with ₦200k in Lagos?", a: "Use the POS blueprint for a budget split and the steps. Most of your capital goes to the float, and you need a clear location and a licensed partner." },
      { q: "Do I need CAC to start a business?", a: "For most formal businesses, yes. Some side hustles can start without it, but a registered business name helps with banks and bigger customers." },
      { q: "Is the hustle generator free?", a: "Yes. The basic plan is free. The premium plan uses a mock checkout on this demo site, to be replaced with a real payment provider before launch." },
    ],
    takeaways: ["Start with capital you can afford to lose.", "Register early when you start getting regular customers.", "Test demand before you stock up."],
    linkPaths: ["/hustle/pos-business", "/hustle/provision-store", "/hustle/suya-spot", "/hustle/thrift-fashion", "/howto/cac-business-name", "/howto/freelancer-tax-tin", "/learn/small-money-side-hustles", "/prices/cost-of-living"],
  });
}

function buildBlueprint(b: Biz) {
  const sample = b.sampleCapital;
  const fixed = b.monthlyCosts.reduce((s, x) => s + x.amount, 0);
  const sections: Section[] = [
    { h2: `What a ${b.name.toLowerCase()} needs to start`, paras: [`A ${b.name.toLowerCase()} typically needs between ${fmt(b.capitalMin)} and ${fmt(b.capitalMax)}. At ${fmt(sample)}, you can start a lean version if you control costs and sell from day one.`, `The biggest mistake new owners make is spending the first naira on decor instead of stock, float or the things customers actually pay for.`], bullets: b.startupBreakdown.map((s) => `${s.item}: ${fmt(sample * s.share)} (${Math.round(s.share * 100)}%)`) },
    { h2: "Monthly costs to plan for", paras: [`Our planning estimate for the fixed monthly costs is about ${fmt(fixed)} for this model. Add your own living costs on top, and make sure your sales cover both.`], bullets: b.monthlyCosts.map((x) => `${x.item}: ${fmt(x.amount)} per month`) },
    { h2: "Margins and profit timeline", paras: [`Estimated gross margin for this model is about ${Math.round(b.grossMarginPct * 100)}%. The honest timeline looks like this:`], bullets: b.profitTimeline.map((p) => `${p.month}: ${p.label}`) },
    { h2: "Step-by-step plan", paras: ["Follow these steps in order. Do not skip the testing and registration parts, because they are the cheapest way to avoid losses later."], bullets: b.steps },
    { h2: "Registration, licences and permits", paras: [`CAC registration is ${b.cacRequired ? "recommended or required for most formal setups" : "optional at the start, but useful later for banks and bigger customers"}. NAFDAC registration is ${b.nafdacRequired ? "required for packaged food sold commercially" : "not usually required for this model"}.`], bullets: b.licences },
    { h2: "Common failure points", paras: ["Most small businesses do not fail because of one big mistake. They fail because of a handful of small leaks that add up. Watch for these early."], bullets: b.failurePoints },
    { h2: "Where to source", paras: ["Good suppliers make or break a hustle. Use the clusters below as starting points, and always test before you commit to bulk."], bullets: b.suppliers.map((s) => `${s.name}: ${s.where}. ${s.note}`) },
  ];
  const faqs: Faq[] = [
    { q: `How much does it cost to start a ${b.name.toLowerCase()} in Nigeria?`, a: `Our planning range is ${fmt(b.capitalMin)} to ${fmt(b.capitalMax)}. A lean start can work from about ${fmt(sample)} if you control costs.` },
    { q: `Do I need CAC for a ${b.name.toLowerCase()}?`, a: b.cacRequired ? "Yes, for most formal setups. A registered business name helps with bank accounts and bigger customers." : "Not always at the start, but it helps once you have regular customers or need a bank account for the business." },
    { q: `How long before a ${b.name.toLowerCase()} makes profit?`, a: b.profitTimeline.map((p) => `${p.month}: ${p.label}`).join(" ") },
    { q: `What is the biggest risk for a ${b.name.toLowerCase()}?`, a: `${b.failurePoints[0]}. Plan for it before you open.` },
  ];
  add({
    path: `/hustle/${b.slug}`, section: "hustle-blueprint", navLabel: b.name, kicker: `Hustle · ${b.category}`,
    title: `${b.name} Blueprint Nigeria 2026: Capital, Steps and Failure Points`,
    metaTitle: `${b.name} Blueprint Nigeria 2026 | NaijaCheck`,
    metaDescription: `How to start a ${b.name.toLowerCase()} in Nigeria: capital ${capWords(b.capitalMin)}–${capWords(b.capitalMax)}, steps, CAC and NAFDAC notes, profit timeline and failure points.`,
    keywords: [`how to start ${b.name.toLowerCase()} nigeria`, `${b.slug.replace(/-/g, " ")} nigeria 2026`],
    params: { slug: b.slug },
    intro: [
      `Thinking about a ${b.name.toLowerCase()}? This blueprint shows the capital you need, how to split it, the steps to launch, and the points where most new owners lose money. Figures are planning estimates for October 2026.`,
      `The free blueprint gives you the outline. The premium blueprint adds detailed plans and supplier directions. Use both before you spend.`,
    ],
    sections, faqs,
    steps: b.steps,
    takeaways: [`Capital range: ${capWords(b.capitalMin)} to ${capWords(b.capitalMax)}.`, `Gross margin estimate: ${Math.round(b.grossMarginPct * 100)}%.`, b.spark],
    linkPaths: [`/hustle/${b.slug}-with-${capLabel(sample)}-in-lagos`, `/hustle/${b.slug}-with-${capLabel(sample)}-in-onitsha`, ...bizSlugs.filter((x) => x !== b.slug).slice(0, 3).map((x) => `/hustle/${x}`), "/howto/cac-business-name", "/howto/freelancer-tax-tin", "/prices/cost-of-living", "/learn/small-money-side-hustles"],
  });
}

function buildCombo(combo: Combo) {
  const b = combo.biz;
  const c = CITY[combo.city];
  const sample = b.sampleCapital;
  const factor = CITY_FACTORS[combo.city];
  const sections: Section[] = [
    { h2: `Your ${capWords(sample)} budget for a ${b.name.toLowerCase()} in ${c.name}`, paras: [`With ${capWords(sample)}, a ${b.name.toLowerCase()} in ${c.name} is a realistic lean start if you control costs. ${factor.note}`, `City factor for ${c.name}: ${factor.multiplier}x compared with our baseline. Use it to decide whether to stretch your budget or to start smaller.`], bullets: b.startupBreakdown.map((s) => `${s.item}: ${fmt(sample * s.share)} (${Math.round(s.share * 100)}%)`) },
    { h2: `Realistic first 90 days in ${c.name}`, paras: ["This plan assumes you test before you commit and keep a daily ledger. It is not a promise. Your local demand decides everything."], bullets: [`Days 1-14: ${b.steps[0]}`, `Days 15-30: ${b.steps[1]}`, `Days 31-60: ${b.steps[2]}`, `Days 61-90: ${b.steps[3]}`] },
    { h2: `Risks specific to ${c.name}`, paras: [`${c.name} is ${c.vibe}. That shapes both your demand and your costs.`, `The most common problems for this model in ${c.name} are: ${b.failurePoints.slice(0, 3).join("; ")}.`] },
    { h2: "Licences and registration", paras: [`${b.cacRequired ? "CAC registration is recommended or required for this model." : "CAC is optional at the start for this model."} ${b.nafdacRequired ? "NAFDAC registration is required for packaged food sold commercially." : "NAFDAC is not usually required for this model."}`], bullets: b.licences },
    { h2: "What the premium plan adds", paras: [b.premiumNotes, `The premium plan uses a mock checkout on this demo site, described on the hustle page. Real payments will be added before launch.`] },
  ];
  const faqs: Faq[] = [
    { q: `How do I start a ${b.name.toLowerCase()} with ${capWords(sample)} in ${c.name}?`, a: `Split your budget using the breakdown above, register your business name, test demand for 30 days, and only then grow your stock or equipment.` },
    { q: `Is ${capWords(sample)} enough for a ${b.name.toLowerCase()} in ${c.name}?`, a: `It can be enough for a lean start if your rent and power are manageable. Check the blueprint's capital range before you commit.` },
    { q: `What is the best location for a ${b.name.toLowerCase()} in ${c.name}?`, a: `Look for foot traffic, parking and regular customers nearby, such as schools, offices, markets or estates.` },
  ];
  add({
    path: `/hustle/${combo.slug}`, section: "hustle-combo", navLabel: `${b.name} with ${capWords(sample)} in ${c.name}`, kicker: `Hustle · ${c.name}`,
    title: `How to Start a ${b.name} With ${capWords(sample)} in ${c.name} (2026 Plan)`,
    metaTitle: `Start a ${b.name} With ${capWords(sample)} in ${c.name} (2026)`,
    metaDescription: `A ${capWords(sample)} plan to start a ${b.name.toLowerCase()} in ${c.name}: budget split, first 90 days, risks, licences and premium options. October 2026.`,
    keywords: [`${b.slug.replace(/-/g, " ")} with ${capLabel(sample)} in ${c.name.toLowerCase()}`, `start ${b.name.toLowerCase()} ${c.name.toLowerCase()} 2026`],
    params: { slug: combo.slug, biz: b.slug, city: combo.city },
    intro: [
      `You have ${capWords(sample)} and you want to start a ${b.name.toLowerCase()} in ${c.name}. This plan shows you how to split the money, what to do in the first 90 days, and the risks that are specific to ${c.name}.`,
      `The numbers are planning estimates for October 2026. Confirm each cost locally before you spend.`,
    ],
    sections, faqs,
    steps: b.steps,
    takeaways: [`Budget: ${capWords(sample)} split across ${b.startupBreakdown.length} areas.`, `Biggest risk: ${b.failurePoints[0]}.`, `City note: ${factor.note}`],
    linkPaths: [`/hustle/${b.slug}`, ...bizSlugs.filter((x) => x !== b.slug).slice(0, 2).map((x) => `/hustle/${x}`), "/howto/cac-business-name", "/howto/freelancer-tax-tin", `/prices/${combo.city}`, "/prices/cost-of-living", "/learn/small-money-side-hustles"],
  });
}

/** Resolve a `related` entry from govhowto.json into a route path. */
function resolveRel(r: string): string {
  if (r.startsWith("/")) return r;
  if (r.startsWith("learn-")) return `/learn/${r.slice("learn-".length)}`;
  if (r === "jamb-cutoff-2026") return "/exam/jamb-cutoff-2026";
  if (DOC[r]) return `/howto/${r}`;
  return `/${r}`;
}

function buildHowTo(d: Doc) {
  const sections: Section[] = [
    { h2: "Quick answer", paras: [`${d.short} Fees: ${d.fee} Timeline: ${d.timeline}`] },
    { h2: "What it costs in 2026", paras: [d.fee, `Source note: ${d.feeSource}`, "Fees change without much notice. Check the official site before you pay, and never pay a 'processing' fee to an unofficial person."] },
    { h2: "Step-by-step", paras: [`Follow these steps in order. Keep a copy of every receipt and screenshot, because you will need them if something goes wrong.`], bullets: d.steps },
    { h2: "Documents you need", paras: ["Have these ready before you start. Missing documents are the number one reason applications stall."], bullets: d.documents },
    { h2: "Mistakes that cost you money", paras: ["These are the errors we see most often. Each one can cost you time, money or both."], bullets: d.pitfalls },
    { h2: "Scam warning", paras: ["Government services in Nigeria are often targeted by touts and fake portals. Only use the official site listed below. If someone asks for cash to 'fast track' your file, walk away and report it."] },
    { h2: "Timeline and what to expect", paras: [d.timeline, "Plan your application early. If you have a travel date, a school deadline or a contract, start at least a month before you need the document."] },
    { h2: "Official site", paras: [`The official site for this service is ${d.officialSite}. Bookmark it and check the URL before you enter any personal details.`] },
  ];
  const shortTitle = d.title.replace(/ 20\d\d.*$/, "");
  const faqs: Faq[] = [
    { q: `How much is ${shortTitle.toLowerCase()} in 2026?`, a: d.fee },
    { q: "How long does this take?", a: d.timeline },
    { q: "Can I do this online?", a: `Where the official portal supports it, yes. Start at ${d.officialSite}. Avoid third-party sites that ask for cash.` },
  ];
  add({
    path: `/howto/${d.slug}`, section: "howto", navLabel: shortTitle, kicker: `GovHowTo · ${d.category}`,
    title: d.title,
    metaTitle: `${shortTitle} 2026: Fees, Steps & Timeline`,
    metaDescription: `${d.short} Current fees, timelines and official steps for 2026. Verify on the official site before you pay.`,
    keywords: [d.slug.replace(/-/g, " "), `${d.slug.replace(/-2026/, "").replace(/-/g, " ")} fee 2026`],
    params: { slug: d.slug }, schemaType: "HowTo",
    intro: [d.short, `This guide gives you the 2026 fee, the timeline, the official steps and the mistakes to avoid. Fee information was last checked on ${DATE_LABEL}. Always confirm on the official site before you pay.`],
    sections, faqs, steps: d.steps,
    takeaways: [`Fee: ${d.fee}`, `Timeline: ${d.timeline}`, `Official site: ${d.officialSite}`],
    linkPaths: [...d.related.map(resolveRel), d.hustleLink, "/howto"],
  });
}

function buildHowToHub() {
  add({
    path: "/howto", section: "hub", navLabel: "GovHowTo hub", kicker: "GovHowTo",
    title: "GovHowTo 2026: Passport, NIN, CAC, Tax and Police Documents",
    metaTitle: "GovHowTo Nigeria 2026: Passport, NIN, CAC & Tax Guides",
    metaDescription: "Step-by-step Nigerian government guides for 2026: passport renewal, NIN correction, police character certificate, CAC business name, freelancer tax and more.",
    keywords: ["passport renewal 2026 nigeria", "nin correction 2026", "police character certificate 2026", "cac business name registration 2026"],
    params: {},
    intro: [
      `Government paperwork in Nigeria is confusing, slow and full of touts. This section gives you the official steps, current fees as reported in 2026, the timelines to expect, and the traps that cost people money.`,
      `Every guide has a last-checked date and a link to the official site. Fees change, so confirm before you pay.`,
    ],
    sections: [
      { h2: "Our most-read guides", paras: ["These are the guides people search for most, based on the requests we see most often."], bullets: govhowto.docs.map((d) => `${d.title}: ${d.fee.split(".")[0]}`) },
      { h2: "How to avoid touts and scams", paras: ["Use only official portals. Never pay cash to someone who promises to skip the line. Keep receipts. If a site asks for your bank PIN or OTP, it is a scam."] },
    ],
    faqs: [
      { q: "How much is an international passport in 2026?", a: "Reported fees for applications in Nigeria are ₦100,000 for the 32-page 5-year booklet and ₦200,000 for the 64-page 10-year booklet. Confirm on immigration.gov.ng." },
      { q: "How much is NIN modification?", a: "Name, address or phone changes were reported at ₦2,000, and DOB at ₦28,574. Some sites still say free, so check first." },
      { q: "Do I need CAC for a small business?", a: "It depends on the business. A business name is useful for bank accounts and bigger customers." },
    ],
    takeaways: ["Use official portals only.", "Confirm the fee on the day you pay.", "Keep receipts for every step."],
    linkPaths: ["/howto/passport-renewal-2026", "/howto/nin-correction", "/howto/police-character-certificate", "/howto/cac-business-name", "/howto/freelancer-tax-tin", "/howto/drivers-licence-frsc", "/hustle", "/learn/spot-fake-job-offers"],
  });
}

function buildExamNational() {
  const cut = exam.nationalCutOff;
  add({
    path: "/exam/jamb-cutoff-2026", section: "exam", navLabel: "JAMB cut-off 2026", kicker: "Exam · JAMB",
    title: "JAMB Cut-Off Mark 2026: Universities, Polytechnics and Colleges",
    metaTitle: "JAMB Cut-Off Mark 2026: Universities & Polytechnics",
    metaDescription: `JAMB cut-off mark 2026: ${cut.universities} for universities, ${cut.polytechnics} for polytechnics. Competitive course ranges and where sources disagree.`,
    keywords: ["jamb cut off mark 2026", "jamb cut off 2026 universities", "jamb cut off 2026 polytechnic"],
    params: {},
    intro: [
      `The JAMB cut-off mark is the national minimum. It is not the same as the score you need to get into a specific course, which can be much higher. This guide explains the national figure, the competitive course ranges, and why sources disagree.`,
      `We use the reports we could verify and flag where outlets differ. Always confirm your target school's current cut-off on its admissions portal.`,
    ],
    sections: [
      { h2: "The national minimum for 2026", paras: [cut.note, `Reported figures: universities ${cut.universities}, polytechnics ${cut.polytechnics}. Sources included ${cut.sources.join(", ")}.`] },
      { h2: "Why your target course matters more", paras: ["Each institution sets its own departmental cut-off, which can be far higher than the national minimum. Medicine, Law and Pharmacy usually sit at the top of the range."] },
      { h2: "Institutions we track", paras: ["These are the schools we have dedicated pages for. Use them to compare, then check the current official list."], bullets: exam.institutions.map((i) => `${i.name}: general ${i.general}`) },
    ],
    faqs: [
      { q: "What is the JAMB cut-off mark for 2026?", a: `The national minimum reported for universities is ${cut.universities}, and ${cut.polytechnics} for polytechnics. Some outlets still list 140, so confirm on jamb.gov.ng.` },
      { q: "Is 200 enough for UNILAG?", a: "Reports suggest UNILAG's general cut-off is about 200, and competitive courses sit much higher. Check the departmental list." },
      { q: "What happens after I pass the cut-off?", a: "Most schools run a Post-UTME screening before admission. Preparation matters." },
    ],
    takeaways: ["National university minimum: 150 (reported 2026).", "Departmental cut-offs are usually higher.", "Confirm on the official JAMB and school portals."],
    linkPaths: ["/exam/jamb-cutoff-unilag-2026", "/exam/jamb-cutoff-ui-2026", "/exam/jamb-cutoff-oau-2026", "/exam/jamb-cutoff-unn-2026", "/exam/jamb-cutoff-abu-2026", "/exam/post-utme-guide-2026", "/exam/jamb-cutoff-private-universities-2026", "/exam"],
  });
}

function buildExamInstitution(i: Institution) {
  const comp = Object.entries(i.competitive).map(([k, v]) => `${k}: ${v}`);
  add({
    path: `/exam/jamb-cutoff-${i.slug}-2026`, section: "exam", navLabel: `${i.short} cut-off 2026`, kicker: `Exam · ${i.short}`,
    title: `JAMB Cut-Off for ${i.name} 2026`,
    metaTitle: `JAMB Cut-Off for ${i.short} 2026: Courses & Post-UTME`,
    metaDescription: `${i.name} JAMB cut-off 2026: general cut-off, competitive course ranges and Post-UTME notes. Confirm on the official list.`,
    keywords: [`jamb cut off for ${i.short.toLowerCase()} 2026`, `${i.short.toLowerCase()} cut off mark 2026`, `${i.short.toLowerCase()} post utme 2026`],
    params: { inst: i.slug },
    intro: [
      `If you want to study at ${i.name}, the first question is the cut-off. The second is the course. This page gives you the general cut-off we have on record, the competitive course ranges, and the Post-UTME steps to prepare for.`,
      i.note,
    ],
    sections: [
      { h2: `General cut-off at ${i.short}`, paras: [`On record: ${i.general}. ${i.note}`] },
      { h2: `Competitive course ranges at ${i.short}`, paras: ["These ranges are reported figures for competitive courses. They change every session, so confirm them on the school's official site before you make a decision."], bullets: comp },
      { h2: "Post-UTME and what to prepare", paras: [i.postUtme ? `${i.short} runs a Post-UTME screening for eligible candidates. Prepare with past questions, the course syllabus and time management practice. Check the school's notice for the registration fee and dates, because they change every session.` : `${i.short} may or may not run a Post-UTME. Check the official notice.`] },
      { h2: "How to choose the right course", paras: ["Choose a course that fits your score, your interest and your career plan. A safer course with a strong curriculum can be better than a risky first choice that you cannot get into."] },
    ],
    faqs: [
      { q: `What is the JAMB cut-off for ${i.short}?`, a: `The general cut-off on record is ${i.general}. Check the department you want.` },
      { q: `Does ${i.short} run Post-UTME?`, a: i.postUtme ? "Yes, for eligible candidates. Check the official notice for your year." : "Check the official notice." },
      { q: "What if I don't reach the cut-off?", a: "Consider other schools with lower cut-offs, or apply for a different course in the same field." },
    ],
    takeaways: [`${i.short} general cut-off: ${i.general}`, comp[0] ?? "Check departmental cut-offs", "Confirm on the official portal."],
    linkPaths: ["/exam/jamb-cutoff-2026", "/exam/post-utme-guide-2026", ...exam.institutions.filter((x) => x.slug !== i.slug).slice(0, 3).map((x) => `/exam/jamb-cutoff-${x.slug}-2026`), "/exam/jamb-registration-2026", "/exam/waec-2026", "/learn/budget-80k"],
  });
}

const GUIDE_BODIES: Record<string, { intro: string[]; sections: Section[]; faqs: Faq[] }> = {
  waec: {
    intro: ["WAEC is the West African Examinations Council. Its exams decide much of the secondary school pathway in Nigeria, so timetables, registration and preparation matter a lot.", "This guide covers how to check the timetable, how to prepare and what to do if the schedule changes. Always check the official WAEC site for dates and fees."],
    sections: [{ h2: "How to check the timetable", paras: ["Use the official WAEC portal and your school's notice board. Save the official date and the centre details, and check again a week before the exam."] }, { h2: "A study plan that works", paras: ["Study one subject a day in focused blocks. Use past questions, mark them yourself, and track the topics you keep getting wrong."], bullets: ["Past questions every week", "Short daily revision of weak topics", "Practice timed papers", "Sleep and water before exam days"] }],
    faqs: [{ q: "When is the WAEC 2026 exam?", a: "Check the official WAEC timetable. Dates vary by paper and by year." }, { q: "How do I register for WAEC?", a: "Through your school, using the official process. Avoid any site that asks for cash outside the official channel." }],
  },
  neco: {
    intro: ["NECO runs the National Examinations Council exams used for school certification in Nigeria. Preparation is similar to WAEC, but check the official NECO rules for your year.", "This guide helps you prepare, check your timetable and avoid common registration mistakes."],
    sections: [{ h2: "Check the official NECO notice", paras: ["NECO dates, fees and registration rules change. Confirm on the NECO portal and your school's notice before you pay or plan your study calendar."] }, { h2: "Preparation checklist", paras: ["A simple checklist keeps you on track."], bullets: ["Confirm your subjects and registration number", "Build a weekly timetable", "Use past questions and the official syllabus", "Plan rest and exam-day logistics"] }],
    faqs: [{ q: "Is NECO the same as WAEC?", a: "They are different exam bodies with different schedules and rules. Check the official notice for your year." }, { q: "Where can I see NECO results?", a: "Use the official NECO results channel for your year." }],
  },
  syllabus: {
    intro: ["A syllabus is the list of topics you are expected to study. This guide is a study guide to help you plan your preparation, not the official syllabus. Always download the official document from WAEC.", "We explain how to use a syllabus, how to find high-value topics, and how to avoid spending weeks on the wrong material."],
    sections: [{ h2: "How to use the syllabus", paras: ["Start with the official WAEC syllabus document for your subject. Turn each topic into a checklist and tick it off as you revise."] }, { h2: "Find high-value topics", paras: ["Past questions show which topics come up often. Track those in a notebook and revise them first."] }],
    faqs: [{ q: "Where do I get the official WAEC syllabus?", a: "From the WAEC official website or your school. Use only official copies." }, { q: "Is this guide the syllabus?", a: "No. It is a study guide. Always check the official syllabus for the exact list of topics." }],
  },
  resumption: {
    intro: ["School resumption dates change by school, state and session. There is no single national date that applies to everyone, so this guide tells you how to confirm yours.", "Check your school's official notice, your state ministry's calendar and any announcements from your university or polytechnic."],
    sections: [{ h2: "How to confirm your resumption date", paras: ["Look at your school's official notice board or website, and check the state education ministry. Keep screenshots, and confirm by phone if the date looks wrong."] }, { h2: "Plan for the new term", paras: ["Set your fee deadline, book transport early and make sure your documents are up to date."], bullets: ["Confirm your fee deadline", "Check hostel and accommodation dates", "Plan transport and data", "Keep your student ID and receipts together"] }],
    faqs: [{ q: "When do schools resume in 2026?", a: "It varies by school. Check your school's official notice." }, { q: "Can I get the date from a WhatsApp group?", a: "Only if it links to an official source. Confirm first." }],
  },
  fees: {
    intro: ["Federal university fees are set by each institution and can change by session, programme and level. This guide shows you how to read a fee schedule and what to ask before you pay.", "We do not publish fee tables we cannot verify. Use the school's official fee schedule for the exact figure."],
    sections: [{ h2: "How to read a fee schedule", paras: ["Look for the session, the faculty, the level and any one-off charges such as acceptance, hostel and development fees. Add them up before you plan the budget."] }, { h2: "Ways to plan for school fees", paras: ["Set a fee savings plan early, avoid cash payments outside the official channel, and keep receipts for every payment."], bullets: ["Check the official fee schedule each session", "Pay only through official accounts", "Keep receipts for every payment", "Ask about payment plans if the school offers them"] }],
    faqs: [{ q: "How much are federal university fees in 2026?", a: "Check the official schedule for your school and course. Fees vary a lot." }, { q: "Is there a payment plan?", a: "Some schools offer instalment options. Ask the bursary." }],
  },
  postutme: {
    intro: ["Post-UTME is the screening that many universities run after JAMB. It can be as important as your JAMB score, so prepare for it early.", "This guide covers what to prepare, how to study and what to avoid."],
    sections: [{ h2: "What to prepare", paras: ["Most Post-UTME tests cover English and general knowledge, and some check your course-specific subjects. Confirm the format on your school's notice."], bullets: ["English comprehension and grammar", "General knowledge and current affairs", "Your course subjects", "Past questions from the school"] }, { h2: "Mistakes to avoid", paras: ["Registering on fake portals, paying cash to agents and missing the deadline are the most common mistakes."] }],
    faqs: [{ q: "Is Post-UTME compulsory?", a: "Many schools require it. Check your target school's notice." }, { q: "How do I prepare in one month?", a: "Focus on English, general knowledge and past questions, and do timed practice every other day." }],
  },
  jamb: {
    intro: ["Your JAMB profile holds your name, NIN and subject choices. Errors can cause problems at admission, so check it early and correct it through the official process.", "This guide covers registration, profile checks and what to avoid when using cyber cafes and agents."],
    sections: [{ h2: "Check your profile", paras: ["Confirm your name, date of birth, subjects and NIN. Mismatches can stop your admission, so fix them early."] }, { h2: "Avoid agents who promise miracles", paras: ["JAMB has an official portal. Pay only through official channels, and keep receipts for every payment."] }],
    faqs: [{ q: "Can I change my JAMB subjects?", a: "Check the official JAMB process and deadlines for your year." }, { q: "What is the JAMB registration fee?", a: "Confirm the current fee on the JAMB portal, since it changes by year." }],
  },
  private: {
    intro: ["Private universities set their own rules, and their cut-offs can be higher than the national minimum. Some run their own screening. This guide lists the private universities reported in 2026 with the cut-offs in our data.", "Confirm each school's cut-off on its official site."],
    sections: [{ h2: "Reported cut-offs", paras: ["These are the cut-offs reported in 2026 coverage. They change each year."], bullets: exam.privateUniversitiesReported2026.map((p) => `${p.name} (${p.state}): ${p.cutOff}`) }, { h2: "Before you apply", paras: ["Check fees, scholarships and course availability. Visit the school's official site for the current list."] }],
    faqs: [{ q: "Are private universities cheaper?", a: "Usually no. Check the fee schedule for each school and course." }, { q: "Do private universities need Post-UTME?", a: "Some do, and some run their own entrance tests. Check each school." }],
  },
};

function buildExamGuide(g: Guide & { kind: string }) {
  const kindKey = g.kind === "syllabus" ? "syllabus" : g.kind;
  const body = GUIDE_BODIES[kindKey] ?? GUIDE_BODIES.private;
  const shortTitle = g.title.replace(/ 20\d\d.*$/, "");
  add({
    path: `/exam/${g.slug}`, section: "exam", navLabel: shortTitle, kicker: "Exam & Education",
    title: g.title,
    metaTitle: `${shortTitle} | NaijaCheck Exam Hub`,
    metaDescription: `${g.title}: practical guide with what to check, how to prepare and the official sources to confirm before you act.`,
    keywords: [g.slug.replace(/-/g, " ")],
    params: { slug: g.slug },
    intro: body.intro, sections: body.sections, faqs: body.faqs,
    takeaways: ["Confirm dates and fees on the official site.", "Use past questions and timed practice.", "Keep receipts for every payment."],
    linkPaths: ["/exam/jamb-cutoff-2026", "/exam/waec-2026", "/exam/neco-2026", "/exam/post-utme-guide-2026", "/exam/jamb-registration-2026", "/learn/budget-80k", "/exam", "/prices/cost-of-living"],
  });
}

function buildExamHub() {
  add({
    path: "/exam", section: "hub", navLabel: "Exam & Education hub", kicker: "Exam & Education",
    title: "Exam and Education Hub: JAMB, WAEC, NECO, Post-UTME and School Fees",
    metaTitle: "JAMB Cut-Off 2026, WAEC, NECO & Post-UTME Guides | NaijaCheck",
    metaDescription: "JAMB cut-off marks 2026 for UNILAG, UI, OAU, UNN and ABU, plus WAEC, NECO, Post-UTME, school resumption and fees guides.",
    keywords: ["jamb cut off for unilag 2026", "jamb cut off 2026", "waec 2026 timetable", "neco 2026"],
    params: {},
    intro: [
      `Students in Nigeria plan their lives around exam dates, cut-offs and school resumption. This hub gives you the numbers and the process, with notes on where sources disagree.`,
      `Start with the national JAMB cut-off, then open the school you want. For WAEC and NECO, use the guides to plan your study and confirm dates on the official sites.`,
    ],
    sections: [
      { h2: "JAMB cut-off marks 2026", paras: [`The national minimum reported for universities is ${exam.nationalCutOff.universities}, with ${exam.nationalCutOff.polytechnics} for polytechnics. Competitive courses sit much higher. Our school pages show the figures we could verify.`], bullets: exam.institutions.map((i) => `${i.name}: ${i.general}`) },
      { h2: "WAEC, NECO and school guides", paras: ["Use the WAEC and NECO guides to plan your study and find the official sources. Use the resumption and fees guides to plan the rest of your year."] },
      { h2: "Post-UTME and registration", paras: ["Post-UTME can decide your admission. Prepare for it early and check your JAMB profile now so there are no surprises later."] },
    ],
    faqs: [
      { q: "What is the JAMB cut-off mark for UNILAG 2026?", a: "Reports suggest about 200 as the general cut-off, with competitive courses higher. Check the UNILAG list." },
      { q: "Where can I find WAEC 2026 timetable?", a: "On the official WAEC site. Our guide tells you how to check and what to prepare." },
      { q: "Are the cut-offs final?", a: "No. They change by session and can be updated after results. Confirm on the official site." },
    ],
    takeaways: ["National university minimum: 150 (reported 2026).", "Departmental cut-offs are the real target.", "Confirm everything on official sites."],
    linkPaths: ["/exam/jamb-cutoff-2026", "/exam/jamb-cutoff-unilag-2026", "/exam/jamb-cutoff-ui-2026", "/exam/waec-2026", "/exam/neco-2026", "/exam/post-utme-guide-2026", "/exam/school-resumption-2026", "/exam/federal-university-fees-2026"],
  });
}

function buildTelecomNetwork(n: Network) {
  const best = telecom.networks.slice().sort((a, b) => a.bestValuePerGb - b.bestValuePerGb)[0];
  const coverageLeader = telecom.networks.find((x) => x.coverage.includes("Best"));
  add({
    path: `/telecom/${n.slug}`, section: "telecom", navLabel: `${n.name} data plans`, kicker: "Telecom",
    title: `${n.name} Data Plans 2026: Prices, Value and Who Should Use It`,
    metaTitle: `${n.name} Data Plans 2026: Prices & Value per GB`,
    metaDescription: `${n.name} data plans 2026: sample prices, value per GB, coverage notes, and who should buy ${n.name}. Indicative. Confirm before you buy.`,
    keywords: [`${n.slug} data plan 2026`, `${n.slug} data price nigeria 2026`],
    params: { slug: n.slug },
    intro: [
      `If you are deciding between ${n.name} and the other networks, price per GB is only part of the answer. Coverage, reliability and your location matter just as much.`,
      `Prices here are indicative from our 2026 comparator. Always confirm with ${n.name}'s app or USSD before you buy.`,
    ],
    sections: [
      { h2: `${n.name} plans we tracked`, paras: [`These are the sample bundles in our comparator. Prices change without much notice.`], bullets: n.plans.map((p) => `${p.label}: ${fmt(p.price)}`) },
      { h2: "Value per GB", paras: [`Our estimated value per GB for ${n.name} is about ${fmt(n.bestValuePerGb)}. Compared with the cheapest network in our comparator (${best.name}, about ${fmt(best.bestValuePerGb)} per GB), that is ${n.slug === best.slug ? "the best value we tracked" : "not the cheapest on pure price"}.`] },
      { h2: "Coverage and reliability", paras: [`${n.coverage}. ${n.fiveG ? "5G is available in some areas." : "5G is not widely available in our tracker."}`], bullets: n.pros },
      { h2: "Watch out for", paras: ["Be careful with bundles that look cheap but have short validity or limited areas. Check the validity period, the time window and whether the bundle works on your device."], bullets: n.cons },
    ],
    faqs: [
      { q: `Is ${n.name} the cheapest data?`, a: `It depends on the bundle and the location. In our tracker, ${best.name} had the best value per GB.` },
      { q: `Does ${n.name} have night data?`, a: "Check the bundle details in the app. Night plans have their own time windows and rules." },
      { q: "Which network has the best coverage?", a: `${coverageLeader?.name ?? "MTN"} is the best-rated in our comparator, but your area matters most.` },
    ],
    takeaways: [`${n.name} sample value: about ${fmt(n.bestValuePerGb)} per GB.`, n.coverage, "Confirm prices with the network before you buy."],
    linkPaths: ["/telecom/cheapest-data-this-week", "/telecom/night-plans", "/telecom/airtime-to-cash", "/telecom/compare-networks", "/learn/data-saving-tips", "/hustle/phone-accessories", "/telecom"],
  });
}

const TELECOM_SPECIAL: Record<string, { title: string; desc: string; intro: string[]; sections: Section[]; faqs: Faq[]; links: string[] }> = {
  "night-plans": {
    title: "Night Data Plans Nigeria 2026: How They Work and When to Use Them",
    desc: "How night data plans work in Nigeria, time windows, validity rules and tips for downloads and updates.",
    intro: ["Night plans are data bundles that only work during set hours, usually overnight. They can be great value if your heavy data use happens after dark.", telecom.nightPlans.summary],
    sections: [
      { h2: "How night plans work", paras: ["Each network sets its own night window and validity rules. Read the bundle details before you buy, including the time window and the number of days it lasts."] },
      { h2: "Tips to get the most from night data", paras: ["Schedule large downloads, cloud backups and app updates in the night window, and turn off background data during the day."], bullets: telecom.nightPlans.tips },
    ],
    faqs: [{ q: "What time do night plans start?", a: "It depends on the network and the bundle. Check the bundle details." }, { q: "Can I use night data during the day?", a: "No, not if the bundle is restricted to the night window." }],
    links: ["/telecom/mtn", "/telecom/airtel", "/telecom/glo", "/telecom/9mobile", "/learn/data-saving-tips"],
  },
  "airtime-to-cash": {
    title: "Airtime to Cash Rates 2026: How It Works and How to Avoid Scams",
    desc: "Airtime to cash rates in Nigeria 2026, how the conversion works, indicative rates by network and scam warnings.",
    intro: ["Airtime to cash lets you turn airtime into money through an approved platform. Rates vary widely, and scams are common, so read this page first.", telecom.airtimeToCash.summary],
    sections: [
      { h2: "Indicative rates", paras: ["These are sample rates from our tracker. Confirm the rate on the platform before you send any airtime."], bullets: telecom.airtimeToCash.sampleRates.map((r) => `${r.network}: about ${Math.round(r.rate * 100)}% (${r.status})`) },
      { h2: "Scam warnings", paras: ["Be careful with anyone who asks you to send airtime first to unlock a payout."], bullets: telecom.airtimeToCash.warnings },
    ],
    faqs: [{ q: "What is the airtime to cash rate today?", a: "It varies. Our sample rates are indicative only. Confirm on the platform." }, { q: "Is airtime to cash safe?", a: "It can be, if you use a platform that shows the rate clearly and has a track record. Avoid unknown sellers." }],
    links: ["/telecom/mtn", "/telecom/airtel", "/telecom/glo", "/telecom/9mobile", "/learn/spot-fake-job-offers"],
  },
  "cheapest-data-this-week": {
    title: "Cheapest Data This Week in Nigeria (October 2026 Comparator)",
    desc: "The cheapest data per GB this week in Nigeria across MTN, Airtel, Glo and 9mobile, from our October 2026 comparator.",
    intro: ["Cheapest data changes often, so this page shows the value-per-GB ranking from our comparator rather than a single 'best' bundle.", "Use the ranking as a starting point, then confirm live prices in each network's app."],
    sections: [
      { h2: "Value per GB ranking", paras: ["Lower is better. These are estimated from sample bundles and are indicative."], bullets: telecom.networks.slice().sort((a, b) => a.bestValuePerGb - b.bestValuePerGb).map((n) => `${n.name}: about ${fmt(n.bestValuePerGb)} per GB`) },
      { h2: "How to pick the right bundle", paras: ["Cheapest per GB is not always best. Consider coverage, your area and how much you use. A bundle that works well in your area can be worth more than a cheaper one that drops out."] },
    ],
    faqs: [{ q: "Which data is cheapest this week?", a: "In our comparator, Glo and 9mobile had the lowest value per GB. Confirm live prices." }, { q: "How often is this updated?", a: "Our telecom data is reviewed when the editor updates the file. Each page shows the date." }],
    links: ["/telecom/glo", "/telecom/9mobile", "/telecom/mtn", "/telecom/airtel", "/learn/data-saving-tips"],
  },
  "compare-networks": {
    title: "MTN vs Airtel vs Glo vs 9mobile: Which Network Should You Use in 2026?",
    desc: "MTN vs Airtel vs Glo vs 9mobile in 2026: value per GB, coverage, night plans and who each network suits.",
    intro: ["Choosing a network is a trade-off between price, coverage and reliability. This guide puts all four side by side.", "Our comparator is indicative. Check coverage in your area before you switch."],
    sections: [
      { h2: "Side-by-side", paras: ["Here is the short version of our comparator."], bullets: telecom.networks.map((n) => `${n.name}: ${n.coverage}; value about ${fmt(n.bestValuePerGb)} per GB; 5G ${n.fiveG ? "yes" : "no"}`) },
      { h2: "Who should use which", paras: ["Choose MTN for coverage, Airtel for city streaming and big bundles, Glo for the lowest price on light use, and 9mobile if your signal is good where you live."] },
    ],
    faqs: [{ q: "Which network is best in Nigeria?", a: "It depends on your area and use. MTN leads on coverage in our comparator." }, { q: "Can I keep my number when I switch?", a: "Yes, through the official number portability process. Check your network's guidance." }],
    links: ["/telecom/mtn", "/telecom/airtel", "/telecom/glo", "/telecom/9mobile", "/telecom/cheapest-data-this-week", "/learn/data-saving-tips"],
  },
};

function buildTelecomSpecial(kind: string) {
  const m = TELECOM_SPECIAL[kind];
  add({
    path: `/telecom/${kind}`, section: "telecom", navLabel: m.title.split(":")[0], kicker: "Telecom & Data",
    title: m.title, metaTitle: `${m.title.split(":")[0]} 2026 | NaijaCheck`, metaDescription: m.desc,
    keywords: [`${kind.replace(/-/g, " ")} nigeria 2026`], params: { slug: kind },
    intro: m.intro, sections: m.sections, faqs: m.faqs,
    takeaways: ["Confirm prices in the network app before you buy.", "Check validity and time windows.", "Beware of anyone asking you to pay first."],
    linkPaths: [...m.links, "/telecom", "/prices/cost-of-living"],
  });
}

function buildTelecomHub() {
  add({
    path: "/telecom", section: "hub", navLabel: "Telecom & Data hub", kicker: "Telecom & Data",
    title: "Telecom and Data in Nigeria 2026: Cheapest Plans, Night Data and Airtime to Cash",
    metaTitle: "Cheapest Data Nigeria 2026: MTN, Airtel, Glo, 9mobile",
    metaDescription: "Cheapest data plans this week, MTN vs Airtel vs Glo vs 9mobile, night plans and airtime to cash rates in Nigeria. Indicative prices, dated.",
    keywords: ["cheapest data nigeria 2026", "mtn vs airtel vs glo vs 9mobile", "night data plans nigeria", "airtime to cash rate today"],
    params: {},
    intro: [
      `Data is one of the biggest monthly costs for Nigerians who work online, study or run a small business. This hub helps you find the cheapest value this week, compare the networks and avoid airtime scams.`,
      `Prices change often. We show sample bundles from our 2026 comparator, labelled indicative, and we tell you how to confirm the live price before you buy.`,
    ],
    sections: [
      { h2: "Networks side by side", paras: ["Use the network pages for detail, and the comparison page for the quick view."], bullets: telecom.networks.map((n) => `${n.name}: ${n.coverage}`) },
      { h2: "Save on data", paras: ["Turn off auto-play, use data saver, and buy a bundle that fits your real usage. See our data saving guide for the full list."] },
    ],
    faqs: [
      { q: "Which network has the cheapest data?", a: "In our comparator, Glo and 9mobile had the lowest value per GB, but coverage matters." },
      { q: "Is night data cheaper?", a: "Sometimes, but only if you can use it in the window. Read the bundle details." },
      { q: "Can I convert airtime to cash safely?", a: "Yes, on platforms that show the rate clearly. Avoid anyone who asks you to pay first." },
    ],
    takeaways: ["Compare value per GB and coverage together.", "Use night plans only if the window fits you.", "Confirm live prices before you buy."],
    linkPaths: ["/telecom/cheapest-data-this-week", "/telecom/compare-networks", "/telecom/night-plans", "/telecom/airtime-to-cash", "/telecom/mtn", "/telecom/glo", "/learn/data-saving-tips", "/hustle/phone-accessories"],
  });
}

function buildCookbookHub() {
  add({
    path: "/tools/cookbook", section: "hub", navLabel: "Market cookbook", kicker: "Tools · Cookbook",
    title: "Recipe and Market Price Cookbook: How Much to Cook Today?",
    metaTitle: "Nigerian Recipe Cost Calculator 2026: Cook for Your Family",
    metaDescription: "Work out how much Afang, Jollof, Egusi, Ofada, Banga and more will cost for your family today, using our market price file.",
    keywords: ["how much to cook afang for family of 6", "cost of jollof rice for party 2026", "nigerian food cost per plate"],
    params: {},
    intro: [
      `Food costs drive the family budget. This cookbook connects recipes to prices, so you can see the cost of a pot before you go to the market.`,
      `The calculator uses our indicative price file and the per-person quantities for each recipe. Pick your city and family size to see the total.`,
    ],
    sections: [
      { h2: "How the cookbook works", paras: ["Each recipe lists the ingredients per person. The calculator multiplies those quantities by your family size and by the midpoint of the price band in your city."] },
      { h2: "Recipes in the cookbook", paras: ["These are the recipes we have costed so far."], bullets: recipesData.recipes.map((r) => `${r.name}: ${r.servesNote}`) },
    ],
    faqs: [
      { q: "How much does Afang cost for a family of 6?", a: `Using our indicative Lagos prices, about ${fmt(recipeCost("afang-soup", "lagos", 6))} for six people. Use the calculator to check your city.` },
      { q: "Are the costs exact?", a: "No. They are estimates from our indicative price file." },
    ],
    takeaways: ["Use per-person costs to plan the week.", "Cook in batches to reduce the cost per plate.", "Check the market before a big cook."],
    linkPaths: ["/tools/cookbook/afang-soup", "/tools/cookbook/jollof-rice", "/tools/cookbook/egusi-soup", "/tools/cookbook/ofada-rice-and-ayamase", "/prices/cost-of-living", "/prices/lagos", "/hustle/home-baking", "/trends/owanbe"],
  });
}

function buildRecipe(r: Recipe) {
  const costs = CITY_SLUGS.map((cs) => ({ city: CITY[cs].name, cost6: recipeCost(r.slug, cs, 6) }));
  const sorted = costs.slice().sort((a, b) => a.cost6 - b.cost6);
  const cheapest = sorted[0];
  const priciest = sorted[sorted.length - 1];
  const lagos6 = recipeCost(r.slug, "lagos", 6);
  const sections: Section[] = [
    { h2: `What ${r.name} costs for a family of 6 today`, paras: [`Using the midpoint of our indicative Lagos prices, a family of six needs about ${fmt(lagos6)} for ${r.name.toLowerCase()}. That is roughly ${fmt(lagos6 / 6)} per person.`, `The cheapest city in our tracker for this recipe is ${cheapest.city} at about ${fmt(cheapest.cost6)}. The most expensive is ${priciest.city} at about ${fmt(priciest.cost6)}.`] },
    { h2: "Ingredients per person", paras: ["These are the per-person quantities used by the calculator. Adjust them for big appetites and heavy soups."], bullets: r.ingredients.map((i) => `${ITEM[i.item]?.name ?? i.item}: ${i.qty} ${i.unit}${i.note ? ` (${i.note})` : ""}`) },
    { h2: "Cost by city for a family of 6", paras: ["Here is the cost for the same family size across our ten cities, using indicative prices."], bullets: costs.map((c) => `${c.city}: ${fmt(c.cost6)}`) },
    { h2: "How to cut the cost", paras: ["Buy the big items in bulk, use seasonal vegetables, and cook once for two meals. The smartest saving is planning the shopping list around what is cheapest that week."], bullets: ["Buy protein on market days when it is cheaper.", "Use frozen fish where it is cheaper per kg.", "Freeze leftover stock in portions.", "Track the weekly cost in your notes app."] },
    { h2: `Why ${r.name.toLowerCase()} is a budget dish`, paras: [`${r.servesNote} It stretches well for a family, and the cost per person stays manageable when you buy in the right markets.`] },
  ];
  const faqs: Faq[] = [
    { q: `How much does ${r.name.toLowerCase()} cost for a family of 6?`, a: `About ${fmt(lagos6)} in Lagos using our indicative midpoints. Check the calculator for your city.` },
    { q: "How do I scale the recipe?", a: "Multiply each per-person quantity by the number of people. The calculator does this for you." },
    { q: "Are these prices exact?", a: "No. They are planning estimates from our price file, so check the market before you shop." },
  ];
  add({
    path: `/tools/cookbook/${r.slug}`, section: "cookbook", navLabel: `${r.name} cost`, kicker: "Tools · Cookbook",
    title: `How Much to Cook ${r.name} for a Family of 6 Today (2026 Cost Guide)`,
    metaTitle: `${r.name} Cost for Family of 6 Today (2026)`,
    metaDescription: `How much to cook ${r.name.toLowerCase()} for a family of 6 today: ingredient costs, per-person cost, city comparison and ways to save.`,
    keywords: [`how much to cook ${r.slug.replace(/-/g, " ")} for family of 6`, `${r.slug.replace(/-/g, " ")} cost 2026`],
    params: { slug: r.slug },
    intro: [
      `${r.servesNote} If you are asking how much to cook ${r.name.toLowerCase()} for a family of six today, here is the number based on our price file, with a city comparison and ingredient breakdown.`,
      `Prices are indicative for ${DATE_LABEL}. Use the calculator on the cookbook page to change family size and city.`,
    ],
    sections, faqs,
    takeaways: [`Lagos family of 6: about ${fmt(lagos6)}.`, `Per person in Lagos: about ${fmt(lagos6 / 6)}.`, `Cheapest city in our tracker: ${cheapest.city}.`],
    linkPaths: [...r.ingredients.slice(0, 2).map((i) => `/prices/lagos/${i.item}`), ...r.related.map((x) => (SLANG[x] ? `/trends/${x}` : "/tools/cookbook")), "/tools/cookbook", "/prices/cost-of-living", "/hustle/home-baking", "/prices/lagos"],
  });
}

function buildTools() {
  add({
    path: "/tools", section: "hub", navLabel: "Tools hub", kicker: "Tools",
    title: "Tools for Nigerian Households and Small Businesses: Generator, Solar, Cookbook",
    metaTitle: "Generator, Solar & Cookbook Calculators Nigeria 2026",
    metaDescription: "Free calculators for Nigerians: generator fuel cost, inverter and solar payback, recipe cost by family size, and a cost-of-living calculator.",
    keywords: ["generator fuel cost calculator nigeria", "solar payback calculator nigeria", "cost of cooking calculator nigeria"],
    params: {},
    intro: [
      `Power, food and money are the three things Nigerian households calculate most often. These tools help you turn prices into decisions, with clear assumptions and room for your own numbers.`,
      `All calculators run in your browser. Nothing you type is stored or sent anywhere. The results are estimates to help you plan.`,
    ],
    sections: [{ h2: "The tools", paras: ["Each tool explains its assumptions on the page. Adjust the inputs to match your real situation."], bullets: ["Generator fuel calculator: daily and monthly diesel or petrol cost", "Solar payback calculator: years to recover your system cost", "Cookbook: cost of a pot of soup or rice for your family", "Cost-of-living calculator: how far your monthly budget goes"] }],
    faqs: [
      { q: "Are the calculators accurate?", a: "They are estimates. Use your own generator's manual and your actual bills to refine the numbers." },
      { q: "Is my data saved?", a: "No. The calculators run in your browser and do not send data to a server." },
    ],
    takeaways: ["Use real numbers from your bills.", "Test more than one scenario.", "Check assumptions before you buy equipment."],
    linkPaths: ["/tools/generator", "/tools/solar", "/tools/cookbook", "/prices/cost-of-living", "/prices/fuel", "/prices/generator-diesel", "/learn/electricity-bill-explained", "/hustle/generator-service"],
  });
  add({
    path: "/tools/generator", section: "tools", navLabel: "Generator fuel calculator", kicker: "Tools · Power",
    title: "Generator Fuel Cost Calculator Nigeria: Diesel and Petrol Per Day and Per Month",
    metaTitle: "Generator Fuel Cost Calculator Nigeria 2026 (Diesel & Petrol)",
    metaDescription: "Estimate your generator fuel cost per day and per month in Nigeria, using current diesel and petrol prices and your load.",
    keywords: ["generator fuel calculator nigeria", "diesel per day generator calculator", "how much diesel does a generator use"],
    params: {},
    intro: [
      `Generator fuel is one of the biggest bills for Nigerian homes and small businesses. This calculator turns your load, running hours and fuel price into a daily and monthly estimate.`,
      `The formula uses a rough fuel-use rate per kilowatt of load. Real generators vary by make and service condition, so treat the result as a planning figure.`,
    ],
    sections: [
      { h2: "How the calculator works", paras: ["It multiplies your load in kilowatts by hours and a fuel-use rate for diesel or petrol, then multiplies by the latest price in the file. Adjust the rate if your generator's manual says otherwise."] },
      { h2: "Ways to reduce generator fuel cost", paras: ["Reduce the load, service the generator, and schedule heavy appliances during power hours."], bullets: ["List your appliances and wattage", "Turn off standby devices", "Service oil and filters on schedule", "Compare the monthly cost with solar payback"] },
    ],
    faqs: [
      { q: "How much diesel does a 10kVA generator use?", a: "It depends on load. Use the calculator with your actual kW load and hours." },
      { q: "Is petrol cheaper than diesel per hour?", a: "Often petrol is cheaper per litre, but the fuel use can differ. Compare the cost per hour, not per litre." },
    ],
    takeaways: ["Load and hours drive the cost.", "Check the diesel price weekly.", "Compare with solar payback."],
    linkPaths: ["/tools/solar", "/prices/generator-diesel", "/prices/fuel", "/prices/cost-of-living", "/learn/electricity-bill-explained", "/hustle/generator-service", "/tools"],
  });
  add({
    path: "/tools/solar", section: "tools", navLabel: "Solar payback calculator", kicker: "Tools · Solar",
    title: "Inverter and Solar Payback Calculator Nigeria 2026",
    metaTitle: "Solar Payback Calculator Nigeria 2026 | Inverter & Solar",
    metaDescription: "Estimate how many years it takes for an inverter or solar system to pay for itself, using your diesel or petrol savings in Nigeria.",
    keywords: ["solar payback calculator nigeria", "inverter payback nigeria", "is solar worth it nigeria 2026"],
    params: {},
    intro: [
      `Solar and inverter systems are expensive upfront, but they can cut your generator bill. This calculator estimates payback by comparing your system cost with the fuel you would save each year.`,
      `It is a planning tool. Real savings depend on your load, sunlight, battery life and maintenance.`,
    ],
    sections: [
      { h2: "How payback is calculated", paras: ["Payback years equal your system cost divided by your annual savings. Annual savings are your monthly generator fuel cost times twelve, minus any ongoing costs you expect."] },
      { h2: "What to check before you buy", paras: ["Check battery life, warranty, installation quality and whether the system can power your full load."], bullets: ["Battery type and warranty", "Inverter capacity versus your peak load", "Installation and maintenance plan", "Your expected stay at the property"] },
    ],
    faqs: [
      { q: "How long does solar take to pay back in Nigeria?", a: "It depends on your costs and usage. Use the calculator with your own numbers." },
      { q: "Do solar systems need maintenance?", a: "Yes. Clean panels, check batteries and keep records of the warranty." },
    ],
    takeaways: ["Payback = system cost / annual savings.", "Use your real fuel bill.", "Check battery warranties."],
    linkPaths: ["/tools/generator", "/prices/generator-diesel", "/prices/fuel", "/learn/electricity-bill-explained", "/hustle/generator-service", "/tools", "/prices/cost-of-living"],
  });
}

function buildLearn(t: Topic) {
  const sections: Section[] = [
    { h2: "The short version", paras: [t.angle], bullets: t.keyPoints },
    { h2: "Why this matters in 2026", paras: ["Costs are high, money is tight, and the wrong decision can cost a whole month of income. Good information is the cheapest protection you have. This guide gives you the points that matter most and the practical steps to act on them this week."] },
    { h2: "A practical plan for this week", paras: ["Pick one point from the list and do it today. Small changes stack up, and a single habit can save you more than a big one-off decision."] },
    { h2: "When to ask for help", paras: ["If the problem involves your money, your documents or your safety, speak to a professional or the official office. Keep records of everything you do."] },
  ];
  const faqs: Faq[] = t.faqs.map(([q, a]) => ({ q, a }));
  add({
    path: `/learn/${t.slug}`, section: "learn", navLabel: t.title, kicker: "Learn",
    title: t.title,
    metaTitle: `${t.title.split(":")[0]} | NaijaCheck Learn`.slice(0, 70),
    metaDescription: `${t.angle} Practical steps, real numbers and the questions people ask in 2026.`,
    keywords: [t.slug.replace(/-/g, " ")], params: { slug: t.slug },
    intro: [t.angle, `We wrote this for busy Nigerians who need the answer, not a lecture. The points below are the ones we would tell a friend.`],
    sections, faqs,
    takeaways: t.keyPoints.slice(0, 3),
    linkPaths: [`/hustle/${t.relatedHustle}`, `/howto/${t.relatedHowTo}`, "/prices/cost-of-living", "/learn", "/prices", "/tools"],
  });
}

function buildLearnHub() {
  add({
    path: "/learn", section: "hub", navLabel: "Learn hub", kicker: "Learn",
    title: "Learn: Money, Work and Daily Life Guides for Nigerians",
    metaTitle: "Learn: Money, Budget & Work Guides Nigeria 2026 | NaijaCheck",
    metaDescription: "Practical guides for Nigerians on budgeting, job scams, electricity bills, data, naira vs dollar, freelancer payments and payslips.",
    keywords: ["how to make 80k last a month lagos", "how to spot fake job offers nigeria", "how to read payslip nigeria"],
    params: {},
    intro: [`These guides are for the everyday questions that cost money: budgeting, job scams, bills, data and paperwork. Each one gives you clear steps, not just theory.`],
    sections: [{ h2: "Our guides", paras: ["Start with the guide that matches your biggest pressure right now."], bullets: learnData.topics.map((t) => t.title) }],
    faqs: [{ q: "Are these guides professional advice?", a: "No. They are general information. For legal, tax or medical matters, speak to a qualified professional." }],
    takeaways: ["Pick one guide and act on it this week.", "Keep records.", "Use official sources."],
    linkPaths: ["/learn/budget-80k", "/learn/spot-fake-job-offers", "/learn/electricity-bill-explained", "/learn/data-saving-tips", "/learn/naira-vs-dollar-explained", "/learn/read-your-payslip", "/prices", "/hustle"],
  });
}

// ---------- run ----------
for (const c of cities.cities) buildPriceCity(c);
for (const c of cities.cities) for (const s of CORE_ITEMS) buildPriceItem(c, s);
for (const m of marketsData.markets) buildPriceMarket(m);
buildPricesHubs();
for (const t of slangData.terms) buildTrendsSlang(t);
for (const t of slangData.psychTerms) buildTrendsPsych(t);
buildTrendsHub();
buildHustleHub();
for (const b of blueprintsData.blueprints) buildBlueprint(b);
for (const c of COMBOS) buildCombo(c);
for (const d of govhowto.docs) buildHowTo(d);
buildHowToHub();
buildExamNational();
for (const i of exam.institutions) buildExamInstitution(i);
for (const g of exam.guides) buildExamGuide(g);
buildExamHub();
for (const n of telecom.networks) buildTelecomNetwork(n);
for (const k of Object.keys(TELECOM_SPECIAL)) buildTelecomSpecial(k);
buildTelecomHub();
buildCookbookHub();
for (const r of recipesData.recipes) buildRecipe(r);
buildTools();
for (const t of learnData.topics) buildLearn(t);
buildLearnHub();

// ---------- link resolution ----------
const labelByPath = new Map(drafts.map((d) => [d.path, d.navLabel]));
const PADDING: Link[] = [
  { href: "/prices", label: "Daily prices" },
  { href: "/trends", label: "Slang decoder" },
  { href: "/hustle", label: "Hustle blueprints" },
  { href: "/howto", label: "GovHowTo" },
  { href: "/exam", label: "Exam hub" },
  { href: "/tools", label: "Tools" },
];

const articles: Article[] = drafts.map((d) => {
  const seen = new Set<string>();
  const links: Link[] = [];
  for (const p of d.linkPaths) {
    if (p === d.path || seen.has(p)) continue;
    const label = labelByPath.get(p);
    if (!label) continue;
    seen.add(p);
    links.push({ href: p, label });
    if (links.length === 8) break;
  }
  for (const pad of PADDING) {
    if (links.length >= 6) break;
    if (pad.href === d.path || seen.has(pad.href)) continue;
    seen.add(pad.href);
    links.push(pad);
  }
  const { linkPaths: _unused, ...rest } = d;
  void _unused;
  const texts = [rest.title, ...rest.intro, ...rest.sections.flatMap((s) => [s.h2, ...s.paras, ...(s.bullets ?? [])]), ...rest.faqs.flatMap((f) => [f.q, f.a]), ...rest.takeaways];
  return { ...rest, links, wordCount: wordCount(texts), updatedAt: UPDATED, schemaType: d.schemaType ?? "Article" };
});

// ---------- write outputs ----------
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "content", "generated");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "articles.json"), JSON.stringify(articles));

const searchIndex = articles.map((a) => ({ path: a.path, title: a.title, kind: a.section, desc: a.metaDescription, keys: a.keywords.join(" ") }));
fs.mkdirSync(path.join(root, "public"), { recursive: true });
fs.writeFileSync(path.join(root, "public", "search-index.json"), JSON.stringify(searchIndex));

const bySection: Record<string, number> = {};
for (const a of articles) bySection[a.section] = (bySection[a.section] ?? 0) + 1;
const avg = Math.round(articles.reduce((s, a) => s + a.wordCount, 0) / articles.length);
const minWords = Math.min(...articles.map((a) => a.wordCount));
const maxWords = Math.max(...articles.map((a) => a.wordCount));
const dupMeta = articles.length - new Set(articles.map((a) => a.metaTitle)).size;
const dupPath = articles.length - new Set(articles.map((a) => a.path)).size;
console.log(`[generate-content] ${articles.length} article pages (avg ${avg} words, min ${minWords}, max ${maxWords}). Duplicate meta titles: ${dupMeta}. Duplicate paths: ${dupPath}.`);
console.log("[generate-content] by section:", bySection);
