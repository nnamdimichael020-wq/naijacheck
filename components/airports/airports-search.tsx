"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { airportTypeLabel, type Airport, type AirportType } from "@/lib/airports";
import { CopyButton } from "@/components/codes/copy-button";
import { Badge } from "@/components/ui/badge";

type TypeFilter = "all" | AirportType;

export function AirportsSearch({ airports }: { airports: Airport[] }) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const counts = useMemo(() => {
    let international = 0;
    let domestic = 0;
    for (const a of airports) {
      if (a.type === "international") international += 1;
      else domestic += 1;
    }
    return { all: airports.length, international, domestic };
  }, [airports]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return airports.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) {
        return false;
      }
      if (!needle) return true;
      const hay = [
        a.name,
        ...(a.alternateNames ?? []),
        a.city,
        a.locality ?? "",
        a.stateName,
        a.lgaName ?? "",
        a.iata ?? "",
        a.icao ?? "",
        a.operator ?? "",
        a.type,
        a.slug.replace(/-/g, " "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [airports, q, typeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block flex-1" htmlFor="airports-search">
          <span className="text-sm font-semibold">Filter by airport, city, state, IATA or ICAO code</span>
          <input
            id="airports-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. LOS, ABV, DNMM, Lagos, Abuja, Uyo, Owerri, Enugu…"
            className="mt-1 w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by scheduled passenger status">
          {(
            [
              { id: "all", label: `All (${counts.all})` },
              { id: "international", label: `International (${counts.international})` },
              { id: "domestic", label: `Domestic (${counts.domestic})` },
            ] as const
          ).map((opt) => {
            const active = typeFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTypeFilter(opt.id)}
                aria-pressed={active}
                className={`inline-flex min-h-11 items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {airports.length} verified public commercial airports
        {typeFilter !== "all" ? ` (${typeFilter} passenger designation)` : ""}
        {q.trim() ? ` matching “${q.trim()}”` : ""}. Sorted A–Z by city.
      </p>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Airport
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  City / State
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  IATA
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  ICAO
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((airport) => {
                const typeLabel = airportTypeLabel(airport.type);
                return (
                  <tr key={airport.slug} className="align-top transition-colors hover:bg-card/60">
                    <td className="px-3 py-3">
                      <Link
                        href={`/airports/${airport.slug}`}
                        className="font-bold text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {airport.name}
                      </Link>
                      {airport.alternateNames && airport.alternateNames.length > 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Also known as: {airport.alternateNames.slice(0, 2).join(" · ")}
                        </p>
                      ) : null}
                      <Link
                        href={`/airports/${airport.slug}`}
                        className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Operator, runway &amp; state links →
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">{airport.city}</p>
                      <Link
                        href={`/geo/${airport.stateSlug}`}
                        className="mt-0.5 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {airport.stateName}
                        {airport.lgaName ? ` · ${airport.lgaName} LGA` : ""}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={airport.type === "international" ? "accent" : "outline"} className="text-[11px]">
                        {typeLabel}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      {airport.iata ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold tabular-nums">{airport.iata}</span>
                          <CopyButton text={airport.iata} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground" title="No assigned global 3-letter IATA code">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {airport.icao ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold tabular-nums">{airport.icao}</span>
                          <CopyButton text={airport.icao} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {airport.lastVerified}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No airport in our {airports.length}-airport directory matched “{q}”
          {typeFilter !== "all" ? ` under the ${typeFilter} filter` : ""}. Try searching by city (e.g.{" "}
          <code>Lagos</code>, <code>Abuja</code>, <code>Uyo</code>, <code>Owerri</code>) or code (<code>LOS</code>,{" "}
          <code>ABV</code>, <code>DNMM</code>), or switch the filter back to <strong>All ({counts.all})</strong>.
        </div>
      )}
    </div>
  );
}
