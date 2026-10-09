"use client";

import * as React from "react";
import { Download, KeyRound, Lock, RotateCcw, Save } from "lucide-react";
import { ADMIN_PASSWORD } from "@/config/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

/**
 * Quick-update console for prices, fuel and slang trend scores.
 *
 * Security note: the password check runs in the browser, so it only keeps casual visitors out.
 * Put /admin behind Cloudflare Access for real protection.
 *
 * Publishing: the site is static. Edits are saved as a draft in this browser. Download the JSON,
 * replace the matching file in /data, commit to GitHub, and Cloudflare Pages rebuilds the site.
 */

type Cities = { slug: string; name: string }[];
type PriceItem = { slug: string; name: string; unit: string; prices: Record<string, number[]> };
type PricesFile = { updatedAt: string; items: PriceItem[]; [k: string]: unknown };
type FuelFile = { updatedAt: string; petrolPump: { state: string; slug: string; price: number }[]; depots: { name: string; product: string; price?: number; range?: number[]; date: string }[]; [k: string]: unknown };
type SlangTerm = { slug: string; term: string; trend: string; trendScore: number; meaning: string };
type SlangFile = { updatedAt: string; terms: SlangTerm[]; [k: string]: unknown };

type Draft = { prices: PricesFile; fuel: FuelFile; slang: SlangFile; savedAt: string | null };
const DRAFT_KEY = "nc_admin_draft_v1";
const AUTH_KEY = "nc_admin_ok";
const TODAY = "2026-10-09";

export function AdminPanel({ cities, prices, fuel, slang }: { cities: Cities; prices: PricesFile; fuel: FuelFile; slang: SlangFile }) {
  const [authed, setAuthed] = React.useState(false);
  const [pw, setPw] = React.useState("");
  const [pwError, setPwError] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>({ prices, fuel, slang, savedAt: null });
  const [hydrated, setHydrated] = React.useState(false);
  const [notice, setNotice] = React.useState("");

  React.useEffect(() => {
    try {
      if (window.sessionStorage.getItem(AUTH_KEY) === "1") setAuthed(true);
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft(JSON.parse(raw) as Draft);
    } catch {
      // Corrupt draft or blocked storage: start from the committed data.
    }
    setHydrated(true);
  }, []);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      try {
        window.sessionStorage.setItem(AUTH_KEY, "1");
      } catch {
        // Session storage blocked. The login still works for this page view.
      }
      setAuthed(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const persist = (next: Draft) => {
    const stamped = { ...next, savedAt: new Date().toISOString() };
    setDraft(stamped);
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(stamped));
    } catch {
      setNotice("Browser storage is blocked, so this draft will not survive a refresh. Download the JSON to keep it.");
      return;
    }
    setNotice("Draft saved in this browser.");
  };

  const discard = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setDraft({ prices, fuel, slang, savedAt: null });
    setNotice("Draft discarded. Showing committed data.");
  };

  const download = (name: string, data: unknown) => {
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading admin…</p>;

  if (!authed) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-5 text-primary" aria-hidden="true" /> Admin sign-in
          </CardTitle>
          <CardDescription>Editors only. This check runs in your browser, so use Cloudflare Access for real protection.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={login} className="space-y-3">
            <div>
              <Label htmlFor="admin-pw">Password</Label>
              <Input id="admin-pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={pwError} />
              {pwError ? <p className="mt-1 text-sm text-destructive">That password is not right. Check with the editor.</p> : null}
            </div>
            <Button type="submit" className="w-full">
              <KeyRound className="size-4" aria-hidden="true" /> Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Quick updates</CardTitle>
            {draft.savedAt ? <Badge variant="accent">Unpublished draft</Badge> : <Badge variant="muted">Matches committed data</Badge>}
          </div>
          <CardDescription>
            Edit, save the draft, then download the JSON and commit it to <code>/data</code>. The live site changes after the next build.
          </CardDescription>
          {notice ? <p role="status" className="text-sm text-primary">{notice}</p> : null}
        </CardHeader>
      </Card>

      <PriceEditor cities={cities} draft={draft} onChange={persist} />
      <FuelEditor draft={draft} onChange={persist} />
      <SlangEditor draft={draft} onChange={persist} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Publish</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download("prices.json", draft.prices)}>
            <Download className="size-4" aria-hidden="true" /> prices.json
          </Button>
          <Button variant="outline" onClick={() => download("fuel.json", draft.fuel)}>
            <Download className="size-4" aria-hidden="true" /> fuel.json
          </Button>
          <Button variant="outline" onClick={() => download("slang.json", draft.slang)}>
            <Download className="size-4" aria-hidden="true" /> slang.json
          </Button>
          <Button variant="ghost" onClick={discard}>
            <RotateCcw className="size-4" aria-hidden="true" /> Discard draft
          </Button>
          <Button variant="secondary" onClick={() => persist(draft)}>
            <Save className="size-4" aria-hidden="true" /> Save draft
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PriceEditor({ cities, draft, onChange }: { cities: Cities; draft: Draft; onChange: (d: Draft) => void }) {
  const [city, setCity] = React.useState("lagos");
  const [item, setItem] = React.useState("rice");
  const current = draft.prices.items.find((i) => i.slug === item);
  const band = current?.prices[city] ?? [0, 0];
  const [low, setLow] = React.useState(band[0]);
  const [high, setHigh] = React.useState(band[1]);

  React.useEffect(() => {
    const b = draft.prices.items.find((i) => i.slug === item)?.prices[city] ?? [0, 0];
    setLow(b[0]);
    setHigh(b[1]);
  }, [city, item, draft.prices]);

  const save = () => {
    const items = draft.prices.items.map((i) => (i.slug === item ? { ...i, prices: { ...i.prices, [city]: [low, high] } } : i));
    onChange({ ...draft, prices: { ...draft.prices, updatedAt: TODAY, items } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Food prices</CardTitle>
        <CardDescription>Set an explicit band for a city. Cities without one are scaled from Lagos by their cost index.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor="ad-city">City</Label>
          <Select id="ad-city" value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ad-item">Item</Label>
          <Select id="ad-item" value={item} onChange={(e) => setItem(e.target.value)}>
            {draft.prices.items.map((i) => (
              <option key={i.slug} value={i.slug}>
                {i.name} ({i.unit})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ad-low">Low (₦)</Label>
          <Input id="ad-low" type="number" value={low} onChange={(e) => setLow(Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label htmlFor="ad-high">High (₦)</Label>
          <Input id="ad-high" type="number" value={high} onChange={(e) => setHigh(Number(e.target.value) || 0)} />
        </div>
        <div className="sm:col-span-4">
          <Button onClick={save} variant="secondary">
            Save price band to draft
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FuelEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const [rows, setRows] = React.useState(draft.fuel.petrolPump);
  const [diesel, setDiesel] = React.useState(
    draft.fuel.depots.find((d) => d.name === "National median depot (diesel)")?.price ?? 0,
  );

  React.useEffect(() => {
    setRows(draft.fuel.petrolPump);
    setDiesel(draft.fuel.depots.find((d) => d.name === "National median depot (diesel)")?.price ?? 0);
  }, [draft.fuel]);

  const save = () => {
    const depots = draft.fuel.depots.map((d) => (d.name === "National median depot (diesel)" ? { ...d, price: diesel, date: TODAY } : d));
    onChange({ ...draft, fuel: { ...draft.fuel, updatedAt: TODAY, petrolPump: rows, depots } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fuel</CardTitle>
        <CardDescription>Petrol pump prices by state, plus the national median depot diesel price. Source each change in the commit message.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {rows.map((r, i) => (
            <div key={r.slug}>
              <Label htmlFor={`fuel-${r.slug}`}>{r.state} petrol (₦/L)</Label>
              <Input
                id={`fuel-${r.slug}`}
                type="number"
                value={r.price}
                onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) || 0 } : x)))}
              />
            </div>
          ))}
        </div>
        <div className="max-w-xs">
          <Label htmlFor="fuel-diesel">National median depot diesel (₦/L)</Label>
          <Input id="fuel-diesel" type="number" value={diesel} onChange={(e) => setDiesel(Number(e.target.value) || 0)} />
        </div>
        <Button onClick={save} variant="secondary">
          Save fuel to draft
        </Button>
      </CardContent>
    </Card>
  );
}

function SlangEditor({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const [slug, setSlug] = React.useState(draft.slang.terms[0]?.slug ?? "");
  const term = draft.slang.terms.find((t) => t.slug === slug);
  const [score, setScore] = React.useState(term?.trendScore ?? 0);
  const [trend, setTrend] = React.useState(term?.trend ?? "steady");
  const [meaning, setMeaning] = React.useState(term?.meaning ?? "");

  React.useEffect(() => {
    const t = draft.slang.terms.find((x) => x.slug === slug);
    setScore(t?.trendScore ?? 0);
    setTrend(t?.trend ?? "steady");
    setMeaning(t?.meaning ?? "");
  }, [slug, draft.slang]);

  const save = () => {
    const terms = draft.slang.terms.map((t) => (t.slug === slug ? { ...t, trendScore: Math.min(100, Math.max(0, score)), trend, meaning } : t));
    onChange({ ...draft, slang: { ...draft.slang, updatedAt: TODAY, terms } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Slang trend scores</CardTitle>
        <CardDescription>Update the editorial trend score, status and meaning. Keep meanings sourced and marked with confidence.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="sl-term">Term</Label>
          <Select id="sl-term" value={slug} onChange={(e) => setSlug(e.target.value)}>
            {draft.slang.terms.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.term}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="sl-score">Trend score (0 to 100)</Label>
          <Input id="sl-score" type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value) || 0)} />
        </div>
        <div>
          <Label htmlFor="sl-trend">Status</Label>
          <Select id="sl-trend" value={trend} onChange={(e) => setTrend(e.target.value)}>
            <option value="rising">Rising</option>
            <option value="steady">Steady</option>
            <option value="falling">Falling</option>
          </Select>
        </div>
        <div className="sm:col-span-3">
          <Label htmlFor="sl-meaning">Meaning</Label>
          <textarea
            id="sl-meaning"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-3">
          <Button onClick={save} variant="secondary">
            Save term to draft
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
