"use client";

import * as React from "react";
import { AdSlot } from "@/components/ads/ad-slot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { naira } from "@/lib/data";

export function SolarCalc() {
  const [cost, setCost] = React.useState(3500000);
  const [monthlyFuel, setMonthlyFuel] = React.useState(450000);
  const [maintenance, setMaintenance] = React.useState(150000);
  const [life, setLife] = React.useState(10);

  const annualSaving = monthlyFuel * 12 - maintenance;
  const payback = annualSaving > 0 ? cost / annualSaving : null;
  const tenYearNet = annualSaving * life - cost;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your system and your current bill</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="sol-cost">Quoted system cost (₦)</Label>
            <Input id="sol-cost" type="number" min={0} step={50000} value={cost} onChange={(e) => setCost(Math.max(0, Number(e.target.value) || 0))} />
            <p className="mt-1 text-xs text-muted-foreground">Inverter, batteries, panels and installation, from your installer's written quote.</p>
          </div>
          <div>
            <Label htmlFor="sol-fuel">Current generator fuel per month (₦)</Label>
            <Input id="sol-fuel" type="number" min={0} step={10000} value={monthlyFuel} onChange={(e) => setMonthlyFuel(Math.max(0, Number(e.target.value) || 0))} />
            <p className="mt-1 text-xs text-muted-foreground">Use the generator calculator to estimate this.</p>
          </div>
          <div>
            <Label htmlFor="sol-maint">Yearly maintenance and battery upkeep (₦)</Label>
            <Input id="sol-maint" type="number" min={0} step={10000} value={maintenance} onChange={(e) => setMaintenance(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <Label htmlFor="sol-life">Years you plan to keep it</Label>
            <Input id="sol-life" type="number" min={1} max={25} value={life} onChange={(e) => setLife(Math.min(25, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/50" aria-live="polite">
        <CardHeader>
          <CardTitle className="text-xl">
            {payback !== null ? `Pays for itself in about ${payback.toFixed(1)} years` : "No payback at these numbers"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Yearly saving (after upkeep)</dt>
              <dd className={`font-semibold tabular-nums ${annualSaving < 0 ? "text-destructive" : ""}`}>{naira(annualSaving)}</dd>
            </div>
            <div className="flex justify-between rounded-md bg-secondary/60 px-3 py-2">
              <dt>Net after {life} years</dt>
              <dd className={`font-semibold tabular-nums ${tenYearNet < 0 ? "text-destructive" : "text-primary"}`}>{naira(tenYearNet)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Payback = system cost ÷ (monthly fuel × 12 − yearly upkeep). It ignores battery replacement timing, price rises, and the fuel you still burn on cloudy
            days, so add a margin. Get two written quotes before you decide.
          </p>
        </CardContent>
      </Card>

      <AdSlot variant="inline" index={5} />
    </div>
  );
}
