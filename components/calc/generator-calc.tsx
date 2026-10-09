"use client";

import * as React from "react";
import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { naira } from "@/lib/data";

/** Planning rates: litres of fuel per kWh of electrical output. Real engines vary, so check the spec sheet. */
const LITRES_PER_KWH = { diesel: 0.28, petrol: 0.36 } as const;
const POWER_FACTOR = 0.8;

export function GeneratorCalc({ dieselDefault, petrolDefault }: { dieselDefault: number; petrolDefault: number }) {
  const [kva, setKva] = React.useState(10);
  const [load, setLoad] = React.useState(60);
  const [hours, setHours] = React.useState(10);
  const [fuel, setFuel] = React.useState<"diesel" | "petrol">("diesel");
  const [price, setPrice] = React.useState(dieselDefault);

  const changeFuel = (f: "diesel" | "petrol") => {
    setFuel(f);
    setPrice(f === "diesel" ? dieselDefault : petrolDefault);
  };

  const kw = kva * POWER_FACTOR * (load / 100);
  const litresPerHour = kw * LITRES_PER_KWH[fuel];
  const litresPerDay = litresPerHour * hours;
  const costPerDay = litresPerDay * price;
  const costPerMonth = costPerDay * 30;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your generator</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="gen-kva">Generator size (kVA)</Label>
            <Input id="gen-kva" type="number" min={1} max={500} step={0.5} value={kva} onChange={(e) => setKva(Math.max(0.5, Number(e.target.value) || 0.5))} />
          </div>
          <div>
            <Label htmlFor="gen-load">Average load (% of rated capacity)</Label>
            <Input id="gen-load" type="number" min={10} max={100} step={5} value={load} onChange={(e) => setLoad(Math.min(100, Math.max(10, Number(e.target.value) || 10)))} />
          </div>
          <div>
            <Label htmlFor="gen-hours">Hours run per day</Label>
            <Input id="gen-hours" type="number" min={1} max={24} step={0.5} value={hours} onChange={(e) => setHours(Math.min(24, Math.max(0.5, Number(e.target.value) || 0.5)))} />
          </div>
          <div>
            <Label htmlFor="gen-fuel">Fuel</Label>
            <Select id="gen-fuel" value={fuel} onChange={(e) => changeFuel(e.target.value as "diesel" | "petrol")}>
              <option value="diesel">Diesel</option>
              <option value="petrol">Petrol</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="gen-price">Price per litre (₦), editable</Label>
            <Input id="gen-price" type="number" min={0} step={5} value={price} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
            <p className="mt-1 text-xs text-muted-foreground">
              Defaults: diesel {naira(dieselDefault)} (national depot median, 6 Oct 2026). Petrol {naira(petrolDefault)} (Lagos NNPC pump, 9 Oct 2026).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/50" aria-live="polite">
        <CardHeader>
          <CardTitle className="text-xl">{naira(costPerMonth)} a month in fuel</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Output</dt>
              <dd className="font-semibold tabular-nums">{kw.toFixed(1)} kW</dd>
            </div>
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Fuel per hour</dt>
              <dd className="font-semibold tabular-nums">{litresPerHour.toFixed(2)} L</dd>
            </div>
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Fuel per day</dt>
              <dd className="font-semibold tabular-nums">{litresPerDay.toFixed(1)} L</dd>
            </div>
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Cost per day</dt>
              <dd className="font-semibold tabular-nums">{naira(costPerDay)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Method: kVA × 0.8 power factor × load % gives kW. kW × {LITRES_PER_KWH[fuel]} L/kWh ({fuel}) gives litres per hour. Monthly figure assumes 30 days. Real
            consumption depends on the engine, its servicing, and load swings, so treat this as a planning number.{" "}
            <Link href="/prices/generator-diesel" className="font-medium text-primary underline-offset-4 hover:underline">
              Read the diesel price guide
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <AdSlot variant="inline" index={4} />
    </div>
  );
}
