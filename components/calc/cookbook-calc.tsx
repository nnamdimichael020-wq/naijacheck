"use client";

import * as React from "react";
import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { naira } from "@/lib/data";

export type CookRecipe = {
  slug: string;
  name: string;
  servesNote: string;
  /** Per-person cost band by city slug, precomputed on the server from the price file. */
  perPerson: Record<string, [number, number]>;
  ingredients: { name: string; qty: number; unit: string }[];
};

export type CookCity = { slug: string; name: string };

/**
 * Live-price scaling. Changing the city or family size re-prices every recipe instantly.
 * With `fixedSlug`, shows one recipe's full ingredient list and cost (used on recipe pages).
 */
export function CookbookCalc({ recipes, cities, fixedSlug, defaultCity = "lagos" }: { recipes: CookRecipe[]; cities: CookCity[]; fixedSlug?: string; defaultCity?: string }) {
  const [city, setCity] = React.useState(defaultCity);
  const [people, setPeople] = React.useState(6);

  const list = fixedSlug ? recipes.filter((r) => r.slug === fixedSlug) : recipes;
  const cityName = cities.find((c) => c.slug === city)?.name ?? city;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scale to your table</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cook-city">City (live prices)</Label>
            <Select id="cook-city" value={city} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cook-people">People to feed</Label>
            <Input id="cook-people" type="number" min={1} max={100} value={people} onChange={(e) => setPeople(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((r, i) => {
          const [lo, hi] = r.perPerson[city] ?? [0, 0];
          return (
            <React.Fragment key={r.slug}>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{r.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{r.servesNote}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="text-2xl font-extrabold tabular-nums">
                    {naira(lo * people)} to {naira(hi * people)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    For {people} {people === 1 ? "person" : "people"} in {cityName}. About {naira(lo)} to {naira(hi)} per plate.
                  </p>
                  {fixedSlug ? (
                    <ul className="mt-2 divide-y rounded-md border text-sm">
                      {r.ingredients.map((ing) => (
                        <li key={ing.name} className="flex justify-between px-3 py-2">
                          <span>{ing.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {(ing.qty * people).toFixed(people * ing.qty < 1 ? 2 : 1)} {ing.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Link href={`/tools/cookbook/${r.slug}`} className="mt-auto text-sm font-semibold text-primary hover:underline">
                      Full recipe and cost guide
                    </Link>
                  )}
                </CardContent>
              </Card>
              {i === 1 ? <AdSlot variant="inline" index={6} className="md:col-span-2" /> : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
