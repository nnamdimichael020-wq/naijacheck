import Link from "next/link";
import {
  Anchor,
  Banknote,
  BarChart3,
  Calculator,
  Droplet,
  FileText,
  Flame,
  Landmark,
  Mail,
  MapPinned,
  MessagesSquare,
  Plane,
  PlaneTakeoff,
  ShieldCheck,
} from "lucide-react";
import { getAirportsStats } from "@/lib/airports";
import { getAirlinesStats } from "@/lib/airlines";
import { getAllBanks } from "@/lib/banks";
import { getOilGasStats } from "@/lib/oil-gas";
import { getPortsStats } from "@/lib/ports";
import { getAllPostalStates, postalPlaceCount } from "@/lib/postal";
import { lgaCounts } from "@/lib/lgas";
import { GOV_DOCS } from "@/lib/data";
import { CHART_PAGES } from "@/lib/chart-pages";

type Tile = {
  href: string;
  label: string;
  promise: string;
  Icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  accent?: string;
};

function buildTiles(): Tile[] {
  const banks = getAllBanks();
  const airportStats = getAirportsStats();
  const airlineStats = getAirlinesStats();
  const oilGasStats = getOilGasStats();
  const portStats = getPortsStats();
  const postalStates = getAllPostalStates();
  const postalPlaces = postalPlaceCount();
  const { lgas, states } = lgaCounts();
  const guides = GOV_DOCS.length;
  const charts = CHART_PAGES.length;

  return [
    {
      href: "/rates",
      label: "Rates & FX history",
      promise: "Official + parallel dollar, with honest history",
      Icon: Banknote,
      badge: "live · daily brief",
    },
    {
      href: "/prices/fuel",
      label: "Fuel price history",
      promise: "Depot petrol & diesel, stored readings only",
      Icon: Droplet,
      badge: "Lagos · depot",
    },
    {
      href: "/codes/banks",
      label: "Bank codes & USSD",
      promise: "Sort codes + *901# style USSD, copy in one tap",
      Icon: Landmark,
      badge: banks.length ? `${banks.length} banks` : undefined,
    },
    {
      href: "/codes/postal",
      label: "Postal / ZIP codes",
      promise: "6-digit NIPOST codes by state & district",
      Icon: Mail,
      badge: postalStates.length ? `${postalStates.length} states · ${postalPlaces} places` : undefined,
    },
    {
      href: "/geo",
      label: "LGAs (774)",
      promise: "Every Local Government Area by state",
      Icon: MapPinned,
      badge: lgas ? `${lgas} LGAs · ${states} states/FCT` : undefined,
    },
    {
      href: "/airports",
      label: "Airports in Nigeria",
      promise: "International & domestic IATA / ICAO codes by state",
      Icon: Plane,
      badge: airportStats.total ? `${airportStats.total} airports · ${airportStats.international} int'l` : undefined,
    },
    {
      href: "/airlines",
      label: "Airlines in Nigeria",
      promise: "Active, suspended & historical carriers + IATA / ICAO codes",
      Icon: PlaneTakeoff,
      badge: airlineStats.total ? `${airlineStats.total} airlines · ${airlineStats.operating} active` : undefined,
    },
    {
      href: "/oil-gas",
      label: "Oil & gas operators",
      promise: "NNPC, IOCs, NLNG, Dangote Refinery & major independents",
      Icon: Flame,
      badge: oilGasStats.total ? `${oilGasStats.total} operators · cited` : undefined,
    },
    {
      href: "/ports",
      label: "Seaports in Nigeria",
      promise: "Apapa, Tin Can, Lekki, Onne & major marine UN/LOCODEs",
      Icon: Anchor,
      badge: portStats.total ? `${portStats.total} ports · UN/LOCODE` : undefined,
    },
    {
      href: "/howto",
      label: "Gov how-to guides",
      promise: "Step-by-step: NIN, passport, CAC & more",
      Icon: FileText,
      badge: guides ? `${guides} guides` : undefined,
    },
    {
      href: "/tools",
      label: "Tools & calculators",
      promise: "Generator, solar, cost-of-living + quiz",
      Icon: Calculator,
      badge: "5 tools · quiz",
    },
    {
      href: "/trends",
      label: "Slang / trends",
      promise: "Decoder for the street — kelebu, japa & co",
      Icon: MessagesSquare,
      badge: "20 terms · trending",
    },
    {
      href: "/charts",
      label: "Charts index",
      promise: "All price charts in one place",
      Icon: BarChart3,
      badge: charts ? `${charts} charts` : undefined,
    },
    {
      href: "/status",
      label: "Status & honesty",
      promise: "How we source, how often we check",
      Icon: ShieldCheck,
      badge: "live sources",
    },
  ];
}

export function ExploreGrid() {
  const tiles = buildTiles();
  return (
    <section aria-labelledby="explore-h" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="explore-h" className="text-xl font-bold tracking-tight sm:text-2xl">
          Explore NaijaCheck
        </h2>
        <span className="text-xs font-medium text-muted-foreground">Pick a hub — every tile goes to a real, sourced page</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.Icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex min-h-[112px] flex-col justify-between rounded-xl border bg-card p-3.5 transition-colors hover:border-primary hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[124px] sm:p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {tile.badge ? (
                  <span className="max-w-[58%] truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold leading-none tracking-wide text-muted-foreground sm:text-[11px]">
                    {tile.badge}
                  </span>
                ) : null}
              </div>
              <div className="mt-3">
                <span className="block text-sm font-semibold leading-tight group-hover:text-primary">{tile.label}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{tile.promise}</span>
              </div>
              <span className="mt-2 inline-flex items-center text-[11px] font-semibold text-primary">
                Open <span aria-hidden className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip:{" "}
        <Link href="/rates" className="font-semibold text-primary underline-offset-2 hover:underline">Rates</Link> for FX,{" "}
        <Link href="/prices/fuel" className="font-semibold text-primary underline-offset-2 hover:underline">Fuel</Link> for depot prices,{" "}
        <Link href="/codes" className="font-semibold text-primary underline-offset-2 hover:underline">/codes</Link> as the bank + postal home,{" "}
        <Link href="/geo" className="font-semibold text-primary underline-offset-2 hover:underline">/geo</Link> for 774 LGAs. All counts come from the same data files that power the pages.
      </p>
    </section>
  );
}
