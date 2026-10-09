"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CAPITAL_MAX, CAPITAL_MIN, CAPITAL_STEP, capLabel, matchBlueprints, type HustleBlueprint, type HustleMatch } from "@/lib/hustle";
import { cn } from "@/lib/utils";

const PREMIUM_KEY = "nc_premium_v1";

const SKILL_OPTIONS: { id: string; label: string }[] = [
  { id: "sales", label: "Sales and haggling" },
  { id: "tech", label: "Phones and tech" },
  { id: "customer-service", label: "Customer service" },
  { id: "cooking", label: "Cooking and baking" },
  { id: "tailoring", label: "Sewing and tailoring" },
  { id: "social-media", label: "Social media" },
  { id: "logistics", label: "Riding and logistics" },
  { id: "electrical", label: "Electrical and mechanical" },
  { id: "none", label: "Still learning" },
];

type CityOpt = { slug: string; name: string };

export function HustleForm({
  blueprints,
  cities,
  cityFactors,
  premiumPrice,
  premiumRange,
}: {
  blueprints: HustleBlueprint[];
  cities: CityOpt[];
  cityFactors: Record<string, { label: string; note: string }>;
  premiumPrice: number;
  premiumRange: [number, number];
}) {
  const [capital, setCapital] = React.useState(200000);
  const [city, setCity] = React.useState("lagos");
  const [skills, setSkills] = React.useState<string[]>(["sales"]);
  const [premium, setPremium] = React.useState(false);

  React.useEffect(() => {
    try {
      setPremium(window.localStorage.getItem(PREMIUM_KEY) === "1");
    } catch {
      setPremium(false);
    }
  }, []);

  const results = React.useMemo(() => matchBlueprints({ capital, city, skills }, blueprints, cityFactors), [capital, city, skills, blueprints, cityFactors]);
  const top = results.slice(0, 3);
  const best = results[0];
  const cityName = cities.find((c) => c.slug === city)?.name ?? city;

  const toggleSkill = (id: string) => setSkills((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-6" id="matcher">
      <Card>
        <CardHeader>
          <CardTitle>Find your hustle</CardTitle>
          <CardDescription>Tell us your capital, city and skills. We match you to the blueprints that fit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-end justify-between gap-3">
              <Label htmlFor="hustle-capital" className="mb-0">
                Capital you can risk
              </Label>
              <span className="text-2xl font-extrabold tabular-nums">{capLabel(capital)}</span>
            </div>
            <input
              id="hustle-capital"
              type="range"
              min={CAPITAL_MIN}
              max={CAPITAL_MAX}
              step={CAPITAL_STEP}
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="mt-3 w-full accent-[hsl(var(--primary))]"
              aria-valuetext={`₦${capital.toLocaleString("en-NG")}`}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>₦150k</span>
              <span>₦2m</span>
            </div>
            <div className="mt-3">
              <Input
                aria-label="Capital in naira"
                type="number"
                inputMode="numeric"
                min={CAPITAL_MIN}
                max={CAPITAL_MAX}
                step={CAPITAL_STEP}
                value={capital}
                onChange={(e) => setCapital(Math.min(CAPITAL_MAX, Math.max(CAPITAL_MIN, Number(e.target.value) || CAPITAL_MIN)))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="hustle-city">Where will you operate?</Label>
              <Select id="hustle-city" value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Your skills</legend>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((opt) => {
                  const on = skills.includes(opt.id);
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      aria-pressed={on}
                      onClick={() => toggleSkill(opt.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        on ? "border-primary bg-primary/15 text-primary" : "border-input text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {results.filter((r) => r.fits).length} blueprints fit {capLabel(capital)} in {cityName}. Showing the top three, free.
      </p>

      <div className="grid gap-4">
        {top.map((m, i) => (
          <FreeResult key={m.blueprint.slug} match={m} rank={i + 1} cityName={cityName} />
        ))}
      </div>

      {best ? (
        <Card className={cn("overflow-hidden", premium ? "border-primary/50" : "border-accent/60")}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Premium</Badge>
              <Badge variant="outline">for your top pick</Badge>
            </div>
            <CardTitle className="text-xl">{best.blueprint.name}: full plan</CardTitle>
            <CardDescription>
              The 90-day steps, every licence, supplier directions, the full failure list and 2026 cost notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {premium ? (
              <PremiumDetail match={best} cityName={cityName} />
            ) : (
              <div className="relative">
                <div aria-hidden="true" className="select-none space-y-2 blur-sm">
                  {best.blueprint.steps.slice(0, 4).map((s) => (
                    <p key={s} className="text-sm">
                      {s}
                    </p>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-4 text-center">
                  <Lock className="size-6 text-accent" aria-hidden="true" />
                  <p className="max-w-sm text-sm">
                    Unlock the full plan for <strong>₦{premiumPrice.toLocaleString("en-NG")}</strong> (one-off). Our test range is ₦{premiumRange[0].toLocaleString("en-NG")} to ₦{premiumRange[1].toLocaleString("en-NG")}.
                  </p>
                  <CheckoutDialog premiumPrice={premiumPrice} onUnlocked={() => setPremium(true)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <AdSlot variant="inline" index={7} />
    </div>
  );
}

function FreeResult({ match, rank, cityName }: { match: HustleMatch; rank: number; cityName: string }) {
  const b = match.blueprint;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>#{rank} match</Badge>
          <Badge variant="muted">{b.category}</Badge>
          {match.fits ? <Badge variant="accent">Fits your capital</Badge> : null}
        </div>
        <CardTitle className="text-xl">{b.name}</CardTitle>
        <CardDescription>
          Range {capLabel(b.capitalMin)} to {capLabel(b.capitalMax)}. {b.spark}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Where your money goes</h3>
          <ul className="space-y-1.5 text-sm">
            {match.startupSplit.map((s) => (
              <li key={s.item} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{s.item}</span>
                <span className="font-semibold tabular-nums">₦{s.amount.toLocaleString("en-NG")}</span>
              </li>
            ))}
          </ul>
          <h3 className="pt-2 text-sm font-semibold">Registration</h3>
          <ul className="space-y-1.5 text-sm">
            <li className="flex gap-2">
              <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", b.cacRequired ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
              CAC: {b.cacRequired ? "required or strongly advised" : "optional at the start"}
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className={cn("mt-0.5 size-4 shrink-0", b.nafdacRequired ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
              NAFDAC: {b.nafdacRequired ? "required for packaged food" : "not usually needed"}
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Suppliers to start with</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {b.suppliers.slice(0, 3).map((s) => (
              <li key={s.name}>
                <span className="text-foreground">{s.name}</span>: {s.where}
              </li>
            ))}
          </ul>
          <h3 className="pt-2 text-sm font-semibold">Profit timeline</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {b.profitTimeline.slice(0, 2).map((p) => (
              <li key={p.month}>
                <span className="font-medium text-foreground">{p.month}:</span> {p.label}
              </li>
            ))}
          </ul>
          <h3 className="pt-2 text-sm font-semibold">Failure points to watch</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {b.failurePoints.slice(0, 2).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        {match.reasons.length || match.cityNote ? (
          <div className="rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground md:col-span-2">
            {match.reasons.map((r) => (
              <p key={r}>• {r}</p>
            ))}
            {rank === 1 ? <p>• In {cityName}: {match.cityNote}</p> : null}
          </div>
        ) : null}
        <div className="md:col-span-2">
          <Link href={`/hustle/${b.slug}`} className="text-sm font-semibold text-primary hover:underline">
            Read the full {b.name.toLowerCase()} blueprint
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PremiumDetail({ match, cityName }: { match: HustleMatch; cityName: string }) {
  const b = match.blueprint;
  return (
    <div className="space-y-5 text-sm">
      <p className="flex items-center gap-2 text-primary">
        <Sparkles className="size-4" aria-hidden="true" /> Premium unlocked on this device.
      </p>
      <div>
        <h3 className="mb-2 font-semibold">90-day steps</h3>
        <ol className="list-decimal space-y-2 pl-5">
          {b.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Licences and permits</h3>
        <ul className="list-disc space-y-1 pl-5">
          {b.licences.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Monthly fixed costs</h3>
        <ul className="space-y-1">
          {b.monthlyCosts.map((c) => (
            <li key={c.item} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{c.item}</span>
              <span className="tabular-nums">₦{c.amount.toLocaleString("en-NG")}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">All suppliers and where to find them</h3>
        <ul className="space-y-2">
          {b.suppliers.map((s) => (
            <li key={s.name}>
              <span className="font-medium">{s.name}</span>: {s.where}. <span className="text-muted-foreground">{s.note}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-semibold">Every failure point</h3>
        <ul className="list-disc space-y-1 pl-5">
          {b.failurePoints.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      <p className="rounded-md bg-secondary/60 p-3 text-xs text-muted-foreground">
        {b.premiumNotes} Costs are estimates for October 2026 in {cityName}. {match.cityNote}
      </p>
    </div>
  );
}

/**
 * MOCK checkout. No money moves and no card data is collected. Before launch, replace the
 * body of `handlePay` with a call to a licensed processor (for example Paystack or Flutterwave)
 * and verify payment on the server.
 */
function CheckoutDialog({ premiumPrice, onUnlocked }: { premiumPrice: number; onUnlocked: () => void }) {
  const [method, setMethod] = React.useState<"card" | "transfer" | "ussd">("transfer");
  const [state, setState] = React.useState<"idle" | "processing" | "done">("idle");
  const [open, setOpen] = React.useState(false);

  const handlePay = () => {
    setState("processing");
    window.setTimeout(() => {
      try {
        window.localStorage.setItem(PREMIUM_KEY, "1");
      } catch {
        // Private browsing may block storage. Premium still unlocks for this view.
      }
      setState("done");
    }, 1600);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setState("idle");
      }}
    >
      <SheetTrigger asChild>
        <Button variant="accent">Unlock premium: ₦{premiumPrice.toLocaleString("en-NG")}</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="text-lg font-bold">Premium blueprint checkout</SheetTitle>
        <SheetDescription className="mb-4 mt-1 text-sm text-muted-foreground">
          One-off ₦{premiumPrice.toLocaleString("en-NG")}. Test range ₦1,500 to ₦3,000.
        </SheetDescription>

        <div className="mb-4 flex items-start gap-2 rounded-md border border-accent/60 bg-accent/10 p-3 text-xs">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <p>
            <strong>Demo only.</strong> This is a mock payment flow. No money is taken and no card details are collected. A licensed payment provider will be
            connected before real payments open.
          </p>
        </div>

        {state === "done" ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 font-semibold text-primary">
              <CheckCircle2 className="size-5" aria-hidden="true" /> Demo payment successful. Premium is unlocked on this device.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setOpen(false);
                onUnlocked();
              }}
            >
              Open my premium plan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Pay with</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["transfer", "Bank transfer"],
                    ["card", "Card"],
                    ["ussd", "USSD"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={method === id}
                    onClick={() => setMethod(id)}
                    className={cn(
                      "rounded-md border px-2 py-2 text-xs font-medium",
                      method === id ? "border-primary bg-primary/15 text-primary" : "border-input text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-muted-foreground">
              {method === "transfer" && "Demo: you would see a virtual account number here."}
              {method === "card" && "Demo: a secure card form from the processor would appear here."}
              {method === "ussd" && "Demo: a USSD code from your bank would appear here."}
            </p>
            <Button className="w-full" variant="accent" onClick={handlePay} disabled={state === "processing"}>
              {state === "processing" ? "Processing demo payment…" : `Pay ₦${premiumPrice.toLocaleString("en-NG")} (demo)`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
