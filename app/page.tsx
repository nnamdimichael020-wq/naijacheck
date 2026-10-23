import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, Droplet, FileText, GraduationCap, Smartphone, Sparkles, TrendingUp, Wrench, Briefcase, Banknote } from "lucide-react";
import { SITE_CONFIG, SITE_TAGLINE, heroMotionForPath } from "@/config/site";
import { AdSlot } from "@/components/ads/ad-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata, absUrl } from "@/lib/seo";
import { LIVE_FX, LIVE_FUEL, latestDatasetDelta } from "@/lib/live";
import { ChangeBadge } from "@/components/live/change-badge";
import { DailyBriefing } from "@/components/live/daily-briefing";
import { Freshness } from "@/components/live/freshness";
import { InstallTip } from "@/components/install-tip";
import { LocationCard } from "@/components/live/location-card";
import { LiveNewsFeed } from "@/components/live/news-feed";
import { ShareControls } from "@/components/share-controls";
import { CategoryBubbleBar } from "@/components/home/category-bubble-bar";
import { ExploreGrid } from "@/components/home/explore-grid";
import { DATASET_REGISTRY } from "@/lib/source-registry";
import {
  BLUEPRINT_BY_SLUG,
  CITIES,
  CITY_BY_SLUG,
  DATA_DATE,
  EXAM,
  GOV_DOCS,
  LEARN_TOPICS,
  RATES,
  SLANG_BY_SLUG,
  SLANG_OF_THE_DAY,
  TELECOM,
  TRENDING_SLUGS,
  bagPrice,
  naira,
  nairaRange,
  priceBand,
  capWords,
} from "@/lib/data";

export const metadata: Metadata = {
  ...pageMetadata({
    path: "/",
    title: `${SITE_CONFIG.name}: ${SITE_TAGLINE}`,
    description:
      "Daily Naija prices, the slang decoder, hustle blueprints with real numbers, GovHowTo steps, exam cut-offs, data plans and calculators. Built for Nigerians.",
    keywords: ["naija prices today", "black market dollar rate", "meaning of kelebu 2026", "JAMB cut off 2026", "start a business in nigeria"],
  }),
  title: { absolute: `${SITE_CONFIG.name}: ${SITE_TAGLINE}` },
};

const TOOL_LINKS = [
  { href: "/prices/cost-of-living", label: "How far will ₦80k go?", icon: Banknote, blurb: "Monthly budget across every city." },
  { href: "/tools/generator", label: "Generator fuel calculator", icon: Calculator, blurb: "Diesel or petrol per day and per month." },
  { href: "/tools/cookbook", label: "Recipe cost by family size", icon: Wrench, blurb: "Indicative dated prices for jollof, afang and more." },
  { href: "/tools/solar", label: "Solar payback calculator", icon: Sparkles, blurb: "How many years to pay off the inverter." },
];

const RICE_CITIES = ["lagos", "onitsha", "kano", "aba"];

export default function HomePage() {
  const trending = TRENDING_SLUGS.map((s) => SLANG_BY_SLUG[s]).filter(Boolean).sort((a, b) => b.trendScore - a.trendScore);
  const sotd = SLANG_BY_SLUG[SLANG_OF_THE_DAY];
  const picks = ["pos-business", "provision-store", "suya-spot"].map((s) => BLUEPRINT_BY_SLUG[s]).filter(Boolean);
  const official = LIVE_FX.official.USD ?? RATES.official.USD;
  const black = LIVE_FX.blackMarket?.USD.buy ?? RATES.blackMarket.USD;
  const petrolMedian = LIVE_FUEL.medians.petrol;
  const dieselMedian = LIVE_FUEL.medians.diesel;
  const lagosDiesel = LIVE_FUEL.depots.diesel.filter((d) => d.state === "Lagos").map((d) => d.price);
  const dieselLagos: [number, number] | null = lagosDiesel.length ? [Math.min(...lagosDiesel), Math.max(...lagosDiesel)] : null;
  const cityNames = Object.fromEntries(CITIES.map((c) => [c.slug, c.name]));
  const jamb = EXAM.nationalCutOff;
  const unilag = EXAM.institutions.find((i) => i.slug === "unilag");
  const officialFxRecord = DATASET_REGISTRY.find((d) => d.id === "cbn-usd")!;
  const parallelFxRecord = DATASET_REGISTRY.find((d) => d.id === "parallel-fx")!;
  const fuelRecord = DATASET_REGISTRY.find((d) => d.id === "fuel-depot")!;
  const cbnDelta = latestDatasetDelta("cbn-usd-ngn");
  const parallelDelta = latestDatasetDelta("parallel-usd-ngn-buy");
  const petrolDelta = latestDatasetDelta("fuel-depot-petrol");
  const dieselDelta = latestDatasetDelta("fuel-depot-diesel");

  return (
    <div className="space-y-8">
      {/* Slim 6-bubble main-hub category rail (home-first, directly under header/WAT/ticker, above briefing) */}
      <CategoryBubbleBar />

      {/* Above-the-fold Daily Briefing */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="accent">
            Every figure shows its source, timestamp &amp; status
          </Badge>
          <ShareControls
            placement="inline"
            title={`${SITE_CONFIG.name}: ${SITE_TAGLINE}`}
            url={absUrl("/")}
            summary="monitored FX & depot fuel, dated planning guides and Nigerian codes — every figure shows source & status"
          />
        </div>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl md:text-4xl">
          {SITE_TAGLINE}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Structured Nigerian daily utility: monitored FX &amp; wholesale fuel readings, dated market guides, GovHowTo steps, exam cut-offs and calculators.
        </p>
      </header>

      <DailyBriefing />

      <InstallTip />

      {/* Quick actions + editorial feature */}
      <section className="grid gap-6 md:grid-cols-[1.05fr_1fr] md:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Practical answers without forum noise
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            Today&apos;s Naija prices, the slang your group chat is using, hustle blueprints with real numbers, GovHowTo steps and calculators. For traders,
            Gen Z, side-hustlers, professionals and students.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href="/prices">See today&apos;s prices</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/hustle#matcher">Find my hustle</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Try:{" "}
            {[
              ["current black market dollar rate", "/prices"],
              ["meaning of kelebu 2026", "/trends/kelebu"],
              ["JAMB cut off for UNILAG 2026", "/exam/jamb-cutoff-unilag-2026"],
              ["rice price in Onitsha today", "/prices/onitsha/rice"],
            ].map(([label, href], i) => (
              <span key={href}>
                {i > 0 ? " · " : null}
                <Link href={href} className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline">
                  {label}
                </Link>
              </span>
            ))}
          </p>
        </div>
        <div className="aspect-[4/5] w-full max-w-sm justify-self-center overflow-hidden rounded-xl border md:justify-self-end">
          {/*
            Home hero image. Motion is read from the flagship allowlist in config/site.ts
            ("/" is allowlisted): the same subtle CSS-only drift as article heroes, clipped
            by this overflow-hidden box, and fully disabled under prefers-reduced-motion.
          */}
          <Image
            src="/images/photos/lagos-tomato-seller.jpg"
            alt="A woman selling tomatoes at a market stall in Lagos"
            width={500}
            height={625}
            priority
            sizes="(min-width: 768px) 360px, 90vw"
            className={
              heroMotionForPath("/") === "subtle"
                ? "article-hero-motion h-full w-full object-cover"
                : "h-full w-full object-cover"
            }
          />
        </div>
      </section>

      <AdSlot variant="banner" index={0} />

      {/* Where you are + live headlines */}
      <section aria-labelledby="where-h" className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <h2 id="where-h" className="sr-only">
          Prices for where you are, and monitored headlines
        </h2>
        <LocationCard
          cityNames={cityNames}
          usdOfficial={official}
          usdBlack={black}
          petrolMedian={petrolMedian}
          dieselLagos={dieselLagos}
          fxAsOf={LIVE_FX.officialAsOf}
          fxState={officialFxRecord.state}
          parallelAsOf={LIVE_FX.blackMarketAsOf}
          parallelState={parallelFxRecord.state}
          fuelAsOf={LIVE_FUEL.asOf}
          fuelState={fuelRecord.state}
        />
        <LiveNewsFeed limit={6} />
      </section>

      {/* Dashboard */}
      <section aria-labelledby="dash" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="dash" className="text-2xl font-bold tracking-tight">
            Today on NaijaCheck
          </h2>
          <Link href="/prices" className="text-sm font-semibold text-primary hover:underline">
            Full prices
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplet className="size-4 text-accent" aria-hidden="true" /> Dollar and fuel
              </CardTitle>
              <CardDescription>Each reading has its own source state.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <dt className="text-muted-foreground">USD official</dt>
                  <dd className="text-xl font-extrabold tabular-nums">₦{official.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</dd>
                  <ChangeBadge delta={cbnDelta} fractionDigits={2} />
                  <Freshness asOf={officialFxRecord.sourceTime} state={officialFxRecord.state} source="CBN" />
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">USD parallel quote</dt>
                  <dd className="text-xl font-extrabold tabular-nums">₦{black.toLocaleString("en-NG")}</dd>
                  <ChangeBadge delta={parallelDelta} fractionDigits={0} />
                  <Freshness asOf={parallelFxRecord.sourceTime} state={parallelFxRecord.state} source="Aboki" />
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Petrol, depot median</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{petrolMedian ? naira(petrolMedian) : "n/a"}/L</dd>
                  <ChangeBadge delta={petrolDelta} unitSuffix="/L" />
                  <Freshness asOf={fuelRecord.sourceTime} state={fuelRecord.state} source="Awajis" />
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">Diesel, depot median</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{dieselMedian ? naira(dieselMedian) : "n/a"}/L</dd>
                  <ChangeBadge delta={dieselDelta} unitSuffix="/L" />
                  <Freshness asOf={fuelRecord.sourceTime} state={fuelRecord.state} source="Awajis" />
                </div>
              </dl>
              <div className="mt-4 flex gap-3 text-sm font-semibold text-primary">
                <Link href="/prices/fuel" className="hover:underline">
                  Fuel guide
                </Link>
                <Link href="/prices/generator-diesel" className="hover:underline">
                  Diesel guide
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="size-4 text-accent" aria-hidden="true" /> Rice watch (1kg)
              </CardTitle>
              <CardDescription>The bag price is in brackets.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {RICE_CITIES.map((c) => (
                  <li key={c} className="flex items-center justify-between gap-2 py-2">
                    <Link href={`/prices/${c}/rice`} className="font-medium hover:text-primary hover:underline">
                      {CITY_BY_SLUG[c].name}
                    </Link>
                    <span className="tabular-nums text-muted-foreground">
                      {nairaRange(priceBand("rice", c))} <span className="text-xs">({naira(bagPrice(c))} bag)</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Planning estimates dated {DATA_DATE} — not live market quotes.{" "}
                <Link href="/status" className="font-semibold text-primary hover:underline">
                  Source &amp; status → /status
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-accent" aria-hidden="true" /> Slang of the day
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sotd ? (
                <>
                  <p className="text-2xl font-extrabold">{sotd.term}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{sotd.meaning}</p>
                  <Link href={`/trends/${sotd.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                    Full meaning and examples <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-accent" aria-hidden="true" /> Trending now
              </CardTitle>
              <CardDescription>Editorial trend index out of 100.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                {trending.map((t, i) => (
                  <li key={t.slug} className="flex items-center justify-between gap-2">
                    <Link href={`/trends/${t.slug}`} className="font-medium hover:text-primary hover:underline">
                      {i + 1}. {t.term}
                    </Link>
                    <Badge variant="muted">{t.trendScore}</Badge>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="size-4 text-accent" aria-hidden="true" /> Hustle picks
              </CardTitle>
              <CardDescription>Capital ranges, not promises.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {picks.map((b) => (
                  <li key={b.slug}>
                    <Link href={`/hustle/${b.slug}`} className="font-semibold hover:text-primary hover:underline">
                      {b.name}
                    </Link>
                    <p className="text-muted-foreground">
                      {capWords(b.capitalMin)} to {capWords(b.capitalMax)}. {b.cacRequired ? "CAC advised." : "CAC optional at start."}
                    </p>
                  </li>
                ))}
              </ul>
              <Link href="/hustle#matcher" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Match my capital <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-accent" aria-hidden="true" /> GovHowTo quick guides
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {GOV_DOCS.slice(0, 4).map((d) => (
                  <li key={d.slug}>
                    <Link href={`/howto/${d.slug}`} className="font-medium hover:text-primary hover:underline">
                      {d.title.replace(/ 20\d\d$/, "")}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/howto" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                All GovHowTo guides <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="size-4 text-accent" aria-hidden="true" /> Exam Hub
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                National JAMB cut-off, reported: <strong>{jamb.universities}</strong> for universities and <strong>{jamb.polytechnics}</strong> for
                polytechnics.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                UNILAG general cut-off: {unilag?.general}. Competitive courses sit much higher.
              </p>
              <Link href="/exam/jamb-cutoff-2026" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Cut-offs by school <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="size-4 text-accent" aria-hidden="true" /> Data value per GB
              </CardTitle>
              <CardDescription>Indicative comparator. Confirm in your network app.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {TELECOM.networks.map((n) => (
                  <li key={n.slug} className="flex justify-between gap-2">
                    <Link href={`/telecom/${n.slug}`} className="font-medium hover:text-primary hover:underline">
                      {n.name}
                    </Link>
                    <span className="tabular-nums text-muted-foreground">about {naira(n.bestValuePerGb)}/GB</span>
                  </li>
                ))}
              </ul>
              <Link href="/telecom" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Compare networks <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      <ExploreGrid />

      {/* FX & fuel history — SEO entry points: modest text links + preview */}
      <section aria-labelledby="history-h" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="history-h" className="text-lg font-bold tracking-tight">
              FX &amp; fuel history — every stored reading, honest gaps
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              No “dollar in 2015” guesses. Charts draw only readings the monitor actually stored (from{" "}
              <span className="font-medium">2026-10-09</span>), up to last 56 per dataset. Gaps mean no reading. Learn why
              official ≠ parallel and depot ≠ pump.
            </p>
          </div>
          <Badge variant="accent">Archive grows as monitor checks</Badge>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li>
            <Link href="/rates" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">
              FX rates &amp; history hub
            </Link>
          </li>
          <li>
            <Link href="/rates/history" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">
              FX archive table
            </Link>
          </li>
          <li>
            <Link href="/prices/fuel" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">
              Fuel depot history
            </Link>
          </li>
          <li>
            <Link href="/charts" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">
              All price charts
            </Link>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Detailed charts:{" "}
          <Link href="/charts/parallel-usd-buy" className="font-semibold text-primary underline-offset-2 hover:underline">
            Parallel USD
          </Link>
          {" · "}
          <Link href="/charts/cbn-usd" className="font-semibold text-primary underline-offset-2 hover:underline">
            CBN USD
          </Link>
          {" · "}
          <Link href="/charts/depot-petrol" className="font-semibold text-primary underline-offset-2 hover:underline">
            Depot petrol
          </Link>
          {" · "}
          <Link href="/charts/depot-diesel" className="font-semibold text-primary underline-offset-2 hover:underline">
            Depot diesel
          </Link>
          {" · "}
          <Link href="/charts/depot-lpg" className="font-semibold text-primary underline-offset-2 hover:underline">
            LPG per kg
          </Link>
          {" · "}
          <Link href="/status" className="font-medium underline-offset-2 hover:underline">
            how we source &amp; how often we check (/status)
          </Link>
          .
        </p>
      </section>

      <AdSlot variant="inline" index={1} />

      {/* Codes hub — Phase B banks + Phase C postal (mobile-friendly, consistent) */}
      <section aria-labelledby="codes-h" className="space-y-3 rounded-xl border bg-card/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="codes-h" className="text-lg font-bold tracking-tight">Codes & LGAs — bank sort/USSD, postal/ZIP & 774 LGAs</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Look up a bank’s 3-digit sort/NIP (058 for GTB) or <code>*901#</code>-style USSD — or a 6-digit NIPOST postal
              code (Ikeja 100001, Garki 900001) — or browse all 774 LGAs by state — copied in one tap, every row with source and last-verified date. No
              guesswork, no fake codes.
            </p>
          </div>
          <Badge variant="accent">12 banks · 37 states · 774 LGAs · verified 2026-10-21</Badge>
        </div>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li>
            <Link href="/codes" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">
              Codes hub →
            </Link>
          </li>
          <li>
            <Link href="/codes/banks" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90">
              Search bank codes
            </Link>
          </li>
          <li>
            <Link href="/codes/postal" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">
              Search postal codes
            </Link>
          </li>
          <li>
            <Link href="/geo" className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 font-semibold hover:border-primary hover:text-primary">
              Browse 774 LGAs
            </Link>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Popular banks:{" "}
          <Link href="/codes/banks/access-bank" className="font-semibold text-primary underline-offset-2 hover:underline">Access 044 *901#</Link>
          {" · "}
          <Link href="/codes/banks/gtbank" className="font-semibold text-primary underline-offset-2 hover:underline">GTB 058 *737#</Link>
          {" · "}
          <Link href="/codes/banks/zenith-bank" className="font-semibold text-primary underline-offset-2 hover:underline">Zenith 057 *966#</Link>
          {" · "}
          <Link href="/codes/banks/first-bank" className="font-semibold text-primary underline-offset-2 hover:underline">FirstBank 011 *894#</Link>
          {" · "}Postal:{" "}
          <Link href="/codes/postal/lagos" className="font-semibold text-primary underline-offset-2 hover:underline">Lagos 100001</Link>
          {" · "}
          <Link href="/codes/postal/fct-abuja" className="font-semibold text-primary underline-offset-2 hover:underline">FCT Abuja 900001</Link>
          {" · "}
          <Link href="/codes/postal/rivers" className="font-semibold text-primary underline-offset-2 hover:underline">Rivers 500001</Link>
          {" · "}
          <Link href="/codes/postal/kano" className="font-semibold text-primary underline-offset-2 hover:underline">Kano 700001</Link>
          {" · "}LGAs:{" "}
          <Link href="/geo/lagos/ikeja" className="font-semibold text-primary underline-offset-2 hover:underline">Ikeja LGA (Lagos)</Link>
          {" · "}
          <Link href="/geo/fct-abuja/bwari" className="font-semibold text-primary underline-offset-2 hover:underline">Bwari (FCT)</Link>
          {" · "}
          <Link href="/geo/kano/kano-municipal" className="font-semibold text-primary underline-offset-2 hover:underline">Kano Municipal</Link>
          {" · "}
          <Link href="/geo" className="font-semibold text-primary underline-offset-2 hover:underline">All 774 LGAs</Link>
          {" · "}
          <Link href="/status" className="font-medium underline-offset-2 hover:underline">how we verify (/status)</Link>.
        </p>
      </section>

      {/* Tools */}
      <section aria-labelledby="tools-h" className="space-y-4">
        <h2 id="tools-h" className="text-2xl font-bold tracking-tight">
          Calculators you can use right now
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {TOOL_LINKS.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.href} href={t.href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <p className="mt-3 font-semibold group-hover:text-primary">{t.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Explainer */}
      <section aria-labelledby="about-h" className="max-w-3xl space-y-4">
        <h2 id="about-h" className="text-2xl font-bold tracking-tight">
          What NaijaCheck is for
        </h2>
        <p className="text-muted-foreground">
          Nigerian money questions are everyday questions: what rice costs this week, what the dollar is doing, whether a business name is worth the ₦10,500,
          what a word means in the group chat. NaijaCheck answers them in plain English, with the date and the source on every number.
        </p>
        <p className="text-muted-foreground">
          We do not sell your data, we do not put pop-ups on your screen, and we keep the page light enough for a 3G connection. Every article gives you the
          next step, and every calculator explains its assumptions.
        </p>
        <div className="flex flex-wrap gap-2 pt-2 text-sm">
          {LEARN_TOPICS.slice(0, 4).map((t) => (
            <Link key={t.slug} href={`/learn/${t.slug}`} className="rounded-full border px-3 py-1.5 hover:border-primary hover:text-primary">
              {t.title}
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
