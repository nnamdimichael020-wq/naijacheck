"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, Globe2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Freshness } from "@/components/live/freshness";
import { STATES, matchState, type StateEntry } from "@/lib/states";
import type { VerificationState } from "@/lib/source-registry";

export type LocationProps = {
  cityNames: Record<string, string>;
  usdOfficial: number;
  usdBlack: number;
  petrolMedian: number | null;
  dieselLagos: [number, number] | null;
  fxAsOf: string | null;
  fxState: VerificationState;
  parallelAsOf: string | null;
  parallelState: VerificationState;
  fuelAsOf: string | null;
  fuelState: VerificationState;
};

type Resolved =
  | { mode: "ng"; state: StateEntry; via: "chosen" | "network" | "timezone" | "guess" }
  | { mode: "abroad"; country: string | null }
  | { mode: "unknown" };

const KEY = "naijacheck:location";
const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");

/**
 * Detects where the visitor is and shows prices for that place.
 * Order: a state they chose before, then the network location from /api/geo (Cloudflare),
 * then the browser timezone. Nothing is sent anywhere else, and the choice stays on this device.
 */
export function LocationCard(p: LocationProps) {
  const [r, setR] = React.useState<Resolved | null>(null);
  const [picking, setPicking] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const chosen = (() => {
        try {
          return localStorage.getItem(KEY);
        } catch {
          return null;
        }
      })();
      const chosenState = chosen ? STATES.find((s) => s.name === chosen) : undefined;
      if (chosenState) {
        if (!cancelled) setR({ mode: "ng", state: chosenState, via: "chosen" });
        return;
      }

      let geo: { country: string | null; region: string | null; timezone: string | null } | null = null;
      try {
        const res = await fetch("/api/geo", { cache: "no-store" });
        if (res.ok) geo = await res.json();
      } catch {
        geo = null;
      }
      const tz = geo?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      let next: Resolved;
      if (geo?.country === "NG" && matchState(geo.region)) {
        next = { mode: "ng", state: matchState(geo.region)!, via: "network" };
      } else if (geo?.country === "NG" || (!geo?.country && tz === "Africa/Lagos")) {
        // Inside Nigeria but region not recognised, or no network location: Lagos if the clock says so.
        next = tz === "Africa/Lagos" ? { mode: "ng", state: STATES.find((s) => s.name === "Lagos")!, via: "timezone" } : { mode: "unknown" };
      } else if (geo?.country && geo.country !== "NG") {
        next = { mode: "abroad", country: geo.country };
      } else {
        next = { mode: "unknown" };
      }
      if (!cancelled) setR(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = (name: string) => {
    try {
      localStorage.setItem(KEY, name);
    } catch {
      /* private mode: keep it for this visit only */
    }
    const s = STATES.find((x) => x.name === name);
    if (s) setR({ mode: "ng", state: s, via: "chosen" });
    setPicking(false);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="size-5 text-primary" aria-hidden="true" />
            {r === null ? "Finding your area…" : r.mode === "ng" ? `Prices for ${r.state.name}` : r.mode === "abroad" ? "Prices for you, abroad" : "Pick your state"}
          </CardTitle>
          {r?.mode === "ng" ? (
            <Badge variant="muted">{r.via === "chosen" ? "Your choice" : r.via === "network" ? "Detected" : r.via === "timezone" ? "Guessed from device" : "Default"}</Badge>
          ) : null}
        </div>
        <CardDescription>
          {r === null ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking your network location
            </span>
          ) : r.mode === "ng" ? (
            `Your nearest priced market is ${p.cityNames[r.state.city] ?? r.state.city}.${r.state.note ? " " + r.state.note : ""}`
          ) : r.mode === "abroad" ? (
            "Naira prices still apply here. Use the converter to see what things cost at home."
          ) : (
            "We could not detect your state. Choose it below and we will remember it on this device."
          )}
        </CardDescription>
      </CardHeader>

      {r ? (
        <CardContent className="space-y-4 pt-0">
          {r.mode === "ng" ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Petrol, depot median</dt>
                <dd className="font-bold tabular-nums">{p.petrolMedian ? `${naira(p.petrolMedian)}/L` : "Checking"}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Diesel, Lagos depots</dt>
                <dd className="font-bold tabular-nums">
                  {p.dieselLagos ? `${naira(p.dieselLagos[0])} to ${naira(p.dieselLagos[1])}/L` : "Checking"}
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Dollar, official</dt>
                <dd className="font-bold tabular-nums">{naira(p.usdOfficial)}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-xs text-muted-foreground">Dollar, black market</dt>
                <dd className="font-bold tabular-nums">{naira(p.usdBlack)}</dd>
              </div>
            </dl>
          ) : null}
          {r.mode === "abroad" ? (
            <p className="flex items-center gap-2 text-sm">
              <Globe2 className="size-4 text-primary" aria-hidden="true" /> Official dollar {naira(p.usdOfficial)} · black market {naira(p.usdBlack)}
            </p>
          ) : null}
          {r.mode === "ng" ? (
            <p className="text-xs text-muted-foreground">
              Depot prices are wholesale. Pump prices at your local station are higher and vary by town.
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {r.mode === "ng" ? (
              <Link href={`/prices/${r.state.city}`} className="font-semibold text-primary hover:underline">
                See {p.cityNames[r.state.city] ?? "your city"} prices →
              </Link>
            ) : null}
            <Link href="/prices/cost-of-living" className="font-semibold text-primary hover:underline">
              Cost-of-living calculator →
            </Link>
          </div>
        </CardContent>
      ) : null}

      <CardContent className="space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <Freshness asOf={p.fxAsOf} label="Official FX" state={p.fxState} source="CBN" />
          <Freshness asOf={p.parallelAsOf} label="Parallel quote" state={p.parallelState} source="Aboki" />
          <Freshness asOf={p.fuelAsOf} label="Fuel depot" state={p.fuelState} source="Awajis" />
        </div>
        {picking ? (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Your state</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              defaultValue={r?.mode === "ng" ? r.state.name : ""}
              onChange={(e) => e.target.value && choose(e.target.value)}
            >
              <option value="" disabled>
                Choose a state
              </option>
              {STATES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <button type="button" onClick={() => setPicking(true)} className="text-xs font-semibold text-primary hover:underline">
            Not your area? Change state
          </button>
        )}
      </CardContent>
    </Card>
  );
}
