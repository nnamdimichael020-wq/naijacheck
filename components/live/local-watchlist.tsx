"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type WatchReading = { id: string; label: string; value: number; unit: string; sourceTime: string | null };
type Watch = { id: string; readingId: string; direction: "above" | "below"; threshold: number };
const KEY = "naijacheck:local-watchlist:v1";

export function LocalWatchlist({ readings }: { readings: WatchReading[] }) {
  const [watches, setWatches] = React.useState<Watch[]>([]);
  const [readingId, setReadingId] = React.useState(readings[0]?.id ?? "");
  const [direction, setDirection] = React.useState<"above" | "below">("above");
  const [threshold, setThreshold] = React.useState(0);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Watch[];
      setWatches(saved.filter((watch) => readings.some((reading) => reading.id === watch.readingId) && Number.isFinite(watch.threshold)));
    } catch { setWatches([]); }
  }, [readings]);

  const save = (next: Watch[]) => {
    setWatches(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage may be disabled */ }
  };
  const add = () => {
    if (!readingId || !Number.isFinite(threshold) || threshold <= 0) return;
    save([...watches, { id: crypto.randomUUID(), readingId, direction, threshold }].slice(-20));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Page-open local watchlist</CardTitle>
        <p className="text-xs text-muted-foreground">Not push notifications. Rules stay in this browser and are checked only when you open this page. No rule or threshold is sent to a server.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Label htmlFor="watch-reading">Reading</Label><Select id="watch-reading" value={readingId} onChange={(event) => setReadingId(event.target.value)}>{readings.map((reading) => <option key={reading.id} value={reading.id}>{reading.label}</option>)}</Select></div>
          <div><Label htmlFor="watch-direction">Trigger</Label><Select id="watch-direction" value={direction} onChange={(event) => setDirection(event.target.value as "above" | "below")}><option value="above">At or above</option><option value="below">At or below</option></Select></div>
          <div><Label htmlFor="watch-threshold">Threshold</Label><Input id="watch-threshold" type="number" min="0.01" step="0.01" value={threshold || ""} onChange={(event) => setThreshold(Number(event.target.value))} /></div>
        </div>
        <button type="button" onClick={add} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save local rule</button>
        {watches.length ? <ul className="divide-y rounded-md border">{watches.map((watch) => {
          const reading = readings.find((item) => item.id === watch.readingId);
          if (!reading) return null;
          const triggered = watch.direction === "above" ? reading.value >= watch.threshold : reading.value <= watch.threshold;
          return <li key={watch.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span><strong>{reading.label}</strong> {watch.direction === "above" ? "≥" : "≤"} {watch.threshold.toLocaleString("en-NG")} {reading.unit}. Current: {reading.value.toLocaleString("en-NG")}.</span>
            <span className={triggered ? "font-semibold text-destructive" : "text-muted-foreground"}>{triggered ? "Rule matches now" : "Not matched"}</span>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => save(watches.filter((item) => item.id !== watch.id))}>Delete</button>
          </li>;
        })}</ul> : <p className="text-sm text-muted-foreground">No local rules saved.</p>}
      </CardContent>
    </Card>
  );
}
