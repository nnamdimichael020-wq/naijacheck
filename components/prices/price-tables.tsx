import Link from "next/link";
import {
  DIRECT_PRICE_CITIES,
  CITY_BY_SLUG,
  DATA_DATE,
  FUEL,
  ITEM_BY_SLUG,
  ITEM_PAGE_SLUGS,
  PRICE_ITEMS,
  bagPrice,
  bandMid,
  cityRank,
  naira,
  nairaRange,
  priceBand,
  petrolForCity,
} from "@/lib/data";

const short = (name: string) => name.split(" (")[0];

const HEAD = "py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const CELL = "py-2.5 pr-3 align-top tabular-nums";

function Wrap({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="border-b bg-secondary/50 px-3 py-2 text-left text-xs text-muted-foreground">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

/** Every city, the core staples, and the 50kg rice bag. Used on /prices. */
export function CityPriceTable() {
  const cols = ["rice", "beans", "garri", "egg"] as const;
  return (
    <Wrap caption={`Dated, unverified planning estimates for cities with explicit rows only (${DATA_DATE}); not live quotes.`}>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>
            City
          </th>
          {cols.map((c) => (
            <th key={c} scope="col" className={HEAD}>
              {short(ITEM_BY_SLUG[c].name)} {c === "egg" ? "(each)" : "(1kg)"}
            </th>
          ))}
          <th scope="col" className={HEAD}>
            Rice 50kg bag
          </th>
        </tr>
      </thead>
      <tbody>
        {DIRECT_PRICE_CITIES.map((c) => (
          <tr key={c.slug} className="border-t">
            <th scope="row" className={`${CELL} font-semibold`}>
              <Link href={`/prices/${c.slug}`} className="hover:text-primary hover:underline">
                {c.name}
              </Link>
            </th>
            {cols.map((k) => (
              <td key={k} className={CELL}>
                {nairaRange(priceBand(k, c.slug))}
              </td>
            ))}
            <td className={CELL}>{naira(bagPrice(c.slug))}</td>
          </tr>
        ))}
      </tbody>
    </Wrap>
  );
}

/** All 17 items for one city. Used on /prices/[city]. */
export function CityItemsTable({ citySlug }: { citySlug: string }) {
  const city = CITY_BY_SLUG[citySlug];
  return (
    <Wrap caption={`All tracked items in ${city.name}. Indicative, ${DATA_DATE}.`}>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>
            Item
          </th>
          <th scope="col" className={HEAD}>
            Unit
          </th>
          <th scope="col" className={HEAD}>
            Band
          </th>
          <th scope="col" className={HEAD}>
            Rank (cheapest = 1)
          </th>
        </tr>
      </thead>
      <tbody>
        {PRICE_ITEMS.map((i) => (
          <tr key={i.slug} className="border-t">
            <td className={CELL}>
              {ITEM_PAGE_SLUGS.includes(i.slug) ? (
                <Link href={`/prices/${citySlug}/${i.slug}`} className="font-medium hover:text-primary hover:underline">
                  {short(i.name)}
                </Link>
              ) : (
                <span className="font-medium">{short(i.name)}</span>
              )}
            </td>
            <td className={CELL}>{i.unit}</td>
            <td className={CELL}>{nairaRange(priceBand(i.slug, citySlug))}</td>
            <td className={CELL}>
              {cityRank(i.slug, citySlug)} of {DIRECT_PRICE_CITIES.length}
            </td>
          </tr>
        ))}
      </tbody>
    </Wrap>
  );
}

/** One item across all cities, sorted cheapest first. Used on /prices/[city]/[item]. */
export function ItemCitiesTable({ itemSlug }: { itemSlug: string }) {
  const item = ITEM_BY_SLUG[itemSlug];
  const rows = [...DIRECT_PRICE_CITIES]
    .map((c) => ({ c, band: priceBand(itemSlug, c.slug) }))
    .sort((a, b) => bandMid(a.band) - bandMid(b.band));
  return (
    <Wrap caption={`${short(item.name)} across Nigeria, cheapest first. ${item.unit}. Indicative.`}>
      <thead>
        <tr>
          <th scope="col" className={HEAD}>
            City
          </th>
          <th scope="col" className={HEAD}>
            Band ({item.unit})
          </th>
          <th scope="col" className={HEAD}>
            Midpoint
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ c, band }) => (
          <tr key={c.slug} className="border-t">
            <td className={CELL}>
              <Link href={`/prices/${c.slug}/${itemSlug}`} className="font-medium hover:text-primary hover:underline">
                {c.name}
              </Link>
            </td>
            <td className={CELL}>{nairaRange(band)}</td>
            <td className={CELL}>{naira(bandMid(band))}</td>
          </tr>
        ))}
      </tbody>
    </Wrap>
  );
}

/** Petrol by state, depot prices, and the matching Lagos/Abuja pump lookups. Used on /prices/fuel. */
export function FuelTables() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Wrap caption="Petrol pump prices by state (NNPC retail list, 9 Oct 2026)">
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              State
            </th>
            <th scope="col" className={HEAD}>
              ₦ per litre
            </th>
          </tr>
        </thead>
        <tbody>
          {FUEL.petrolPump.map((p) => (
            <tr key={p.slug} className="border-t">
              <td className={CELL}>{p.state}</td>
              <td className={CELL}>{naira(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </Wrap>
      <Wrap caption="Depot and gantry prices (wholesale, not pump)">
        <thead>
          <tr>
            <th scope="col" className={HEAD}>
              Benchmark
            </th>
            <th scope="col" className={HEAD}>
              ₦ per litre
            </th>
            <th scope="col" className={HEAD}>
              Date
            </th>
          </tr>
        </thead>
        <tbody>
          {FUEL.depots.map((d) => (
            <tr key={d.name} className="border-t">
              <td className={CELL}>{d.name}</td>
              <td className={CELL}>{d.range ? `${naira(d.range[0])} to ${naira(d.range[1])}` : naira(d.price as number)}</td>
              <td className={CELL}>{d.date}</td>
            </tr>
          ))}
        </tbody>
      </Wrap>
      <p className="text-xs text-muted-foreground md:col-span-2">
        Lagos pump lookup: {naira(petrolForCity("lagos") ?? 0)}/L. Abuja (FCT) lookup: {naira(petrolForCity("abuja") ?? 0)}/L. {FUEL.dieselNote}
      </p>
    </div>
  );
}

/** Mean rank helper used by the city hub copy. */
export const cityCount = DIRECT_PRICE_CITIES.length;
