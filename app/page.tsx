import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calculator, Droplet, FileText, GraduationCap, Smartphone, Sparkles, TrendingUp, Wrench, Briefcase, Banknote } from "lucide-react";
import { SITE_CONFIG, SITE_TAGLINE } from "@/config/site";
import { AdSlot } from "@/components/ads/ad-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pageMetadata } from "@/lib/seo";
import { LIVE_FX, LIVE_FUEL } from "@/lib/live";
import { Freshness } from "@/components/live/freshness";
import { LocationCard } from "@/components/live/location-card";
import { LiveNewsFeed } from "@/components/live/news-feed";
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
  { href: "/tools/cookbook", label: "Recipe cost by family size", icon: Wrench, blurb: "Live prices for jollof, afang and more." },
  { href: "/tools/solar", label: "Solar payback calculator", icon: Sparkles, blurb: "How many years to pay off the inverter." },
];

const RICE_CITIES = ["lagos", "onitsha", "kano", "aba", "abuja"];

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

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="grid gap-6 md:grid-cols-[1.05fr_1fr] md:items-center">
        <div>
          <Badge variant="accent" className="mb-3">
            Updated {DATA_DATE} · prices marked indicative
          </Badge>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">{SITE_TAGLINE}</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Today&apos;s Naija prices, the slang your group chat is using, hustle blueprints with real numbers, GovHowTo steps and calculators. For traders,
            Gen Z, side-hustlers, professionals and students.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
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
        <Image
          src="/images/photos/lagos-tomato-seller.jpg"
          alt="A woman selling tomatoes at a market stall in Lagos"
          width={500}
          height={625}
          priority
          sizes="(min-width: 768px) 360px, 90vw"
          className="aspect-[4/5] w-full max-w-sm justify-self-center rounded-xl border object-cover md:justify-self-end"
        />
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
          fuelAsOf={LIVE_FUEL.asOf}
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
              <CardDescription>
                <Freshness asOf={LIVE_FX.officialAsOf} label="FX" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">USD official</dt>
                  <dd className="text-xl font-extrabold tabular-nums">₦{official.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">USD black market</dt>
                  <dd className="text-xl font-extrabold tabular-nums">₦{black.toLocaleString("en-NG")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Petrol, depot median</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{petrolMedian ? naira(petrolMedian) : "n/a"}/L</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Diesel, depot median</dt>
                  <dd className="text-xl font-extrabold tabular-nums">{dieselMedian ? naira(dieselMedian) : "n/a"}/L</dd>
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
              <p className="mt-2 text-xs text-muted-foreground">Ranges for planning. Confirm at the market.</p>
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

      <AdSlot variant="inline" index={1} />

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
