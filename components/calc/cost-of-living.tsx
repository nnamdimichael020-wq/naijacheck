"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AdSlot } from "@/components/ads/ad-slot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { naira } from "@/lib/data";

type CityRow = { slug: string; name: string; basket: number };
type NonFood = { label: string; amount: number };

/** Power is per household. Data, transport and airtime are per adult. */
const perHousehold = (label: string) => /electric|generator|power/i.test(label);

export function CostOfLivingCalc({ cities, nonFood, defaultCity = "lagos" }: { cities: CityRow[]; nonFood: NonFood[]; defaultCity?: string }) {
  const [city, setCity] = React.useState(defaultCity);
  const [adults, setAdults] = React.useState(1);
  const [budget, setBudget] = React.useState(80000);
  const [rent, setRent] = React.useState(0);

  const cost = (c: CityRow) => {
    const food = c.basket * adults;
    const other = nonFood.reduce((s, n) => s + n.amount * (perHousehold(n.label) ? 1 : adults), 0);
    const total = food + other + rent;
    return { food, other, total, remaining: budget - total };
  };

  const current = cities.find((c) => c.slug === city) ?? cities[0];
  const r = cost(current);
  const covered = Math.max(0, Math.min(100, Math.round((budget / Math.max(1, r.total)) * 100)));
  const ok = r.remaining >= 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your monthly numbers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="col-city">City</Label>
            <Select id="col-city" value={city} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="col-budget">Monthly money you have (₦)</Label>
            <Input id="col-budget" type="number" min={0} step={5000} inputMode="numeric" value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <Label htmlFor="col-adults">Adults in the household</Label>
            <Select id="col-adults" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="col-rent">Monthly rent (₦, optional)</Label>
            <Input id="col-rent" type="number" min={0} step={5000} inputMode="numeric" value={rent} onChange={(e) => setRent(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </CardContent>
      </Card>

      <Card className={ok ? "border-primary/50" : "border-destructive/60"} aria-live="polite">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            {ok ? <CheckCircle2 className="size-5 text-primary" aria-hidden="true" /> : <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />}
            {ok ? `${naira(r.remaining)} left over in ${current.name}` : `${naira(Math.abs(r.remaining))} short in ${current.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary" role="img" aria-label={`Your money covers ${covered} percent of the monthly needs`}>
            <div className={`h-full rounded-full ${ok ? "bg-primary" : "bg-destructive"}`} style={{ width: `${covered}%` }} />
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Food basket ({adults} adult{adults > 1 ? "s" : ""})</dt>
              <dd className="font-semibold tabular-nums">{naira(r.food)}</dd>
            </div>
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Data, transport, power, airtime</dt>
              <dd className="font-semibold tabular-nums">{naira(r.other)}</dd>
            </div>
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Rent</dt>
              <dd className="font-semibold tabular-nums">{naira(rent)}</dd>
            </div>
            <div className="flex justify-between rounded-md bg-primary/15 px-3 py-2 font-semibold">
              <dt>Total you need</dt>
              <dd className="tabular-nums">{naira(r.total)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Food uses the midpoint of our indicative price bands for {current.name}. Power is counted once per household. Everything else is per adult. Estimates only.
          </p>
        </CardContent>
      </Card>

      <AdSlot variant="inline" index={3} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Same budget, every city</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th scope="col" className="py-2 pr-3 font-medium">
                  City
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Total needed
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Left over
                </th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => {
                const x = cost(c);
                return (
                  <tr key={c.slug} className="border-b last:border-0">
                    <td className="py-2 pr-3">{c.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{naira(x.total)}</td>
                    <td className={`py-2 text-right font-semibold tabular-nums ${x.remaining >= 0 ? "text-primary" : "text-destructive"}`}>
                      {x.remaining >= 0 ? naira(x.remaining) : `−${naira(Math.abs(x.remaining))}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
