"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  airlineStatusShortLabel,
  isHistoricalAirlineStatus,
  type Airline,
  type AirlineStatus,
} from "@/lib/airlines";
import { CopyButton } from "@/components/codes/copy-button";
import { Badge } from "@/components/ui/badge";

type StatusFilter = "all" | "operating" | "suspended" | "historical";

export type HubAirportChip = {
  slug: string;
  city: string;
  code: string;
};

function statusBadgeVariant(status: AirlineStatus): "accent" | "outline" | "muted" {
  if (status === "operating") return "accent";
  if (status === "suspended") return "muted";
  return "outline";
}

export function AirlinesSearch({
  airlines,
  airportLookup,
}: {
  airlines: Airline[];
  airportLookup: Record<string, HubAirportChip>;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    let operating = 0;
    let suspended = 0;
    let historical = 0;
    for (const a of airlines) {
      if (a.status === "operating") operating += 1;
      else if (a.status === "suspended") suspended += 1;
      else if (isHistoricalAirlineStatus(a.status)) historical += 1;
    }
    return {
      all: airlines.length,
      operating,
      suspended,
      historical,
    };
  }, [airlines]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return airlines.filter((a) => {
      if (statusFilter === "operating" && a.status !== "operating") return false;
      if (statusFilter === "suspended" && a.status !== "suspended") return false;
      if (statusFilter === "historical" && !isHistoricalAirlineStatus(a.status)) return false;

      if (!needle) return true;
      const hubText = a.hubAirportSlugs
        .map((slug) => {
          const ap = airportLookup[slug];
          return ap ? `${ap.city} ${ap.code}` : slug.replace(/-/g, " ");
        })
        .join(" ");

      const hay = [
        a.name,
        a.fullLegalName ?? "",
        ...(a.formerNames ?? []),
        a.status,
        airlineStatusShortLabel(a.status),
        a.iata ?? "",
        a.icao ?? "",
        a.callsign ?? "",
        a.yearsActive ?? "",
        a.headquartersCity ?? "",
        a.stateName,
        a.notes ?? "",
        hubText,
        a.slug.replace(/-/g, " "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [airlines, airportLookup, q, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="block flex-1" htmlFor="airlines-search">
          <span className="text-sm font-semibold">
            Filter by airline name, former name, IATA / ICAO code, callsign, or hub city
          </span>
          <input
            id="airlines-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Air Peace, P4, Ibom Air, QI, Virgin Nigeria, WT, Dana, Enugu, Uyo…"
            className="mt-1 w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter airlines by operating status">
          {(
            [
              { id: "all", label: `All (${counts.all})` },
              { id: "operating", label: `Operating (${counts.operating})` },
              { id: "suspended", label: `Suspended (${counts.suspended})` },
              { id: "historical", label: `Ceased or historical (${counts.historical})` },
            ] as const
          ).map((opt) => {
            const active = statusFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(opt.id)}
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
        Showing {filtered.length} of {airlines.length} verified Nigerian scheduled passenger airlines
        {statusFilter !== "all" ? ` (${statusFilter} filter)` : ""}
        {q.trim() ? ` matching “${q.trim()}”` : ""}. Active scheduled carriers appear first, followed by suspended and
        historical operators.
      </p>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Airline
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  IATA
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  ICAO
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Notes &amp; hubs
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((airline) => {
                const isHist = isHistoricalAirlineStatus(airline.status);
                const hubs = airline.hubAirportSlugs
                  .slice(0, 3)
                  .map((slug) => airportLookup[slug])
                  .filter(Boolean);

                return (
                  <tr key={airline.slug} className="align-top transition-colors hover:bg-card/60">
                    <td className="px-3 py-3">
                      <Link
                        href={`/airlines/${airline.slug}`}
                        className="font-bold text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {airline.name}
                      </Link>
                      {airline.formerNames && airline.formerNames.length > 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Formerly / also: {airline.formerNames.slice(0, 2).join(" · ")}
                        </p>
                      ) : null}
                      {airline.yearsActive ? (
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{airline.yearsActive}</p>
                      ) : null}
                      <Link
                        href={`/airlines/${airline.slug}`}
                        className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Status record, hubs &amp; sources →
                      </Link>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge variant={statusBadgeVariant(airline.status)} className="text-[11px]">
                        {airlineStatusShortLabel(airline.status)}
                      </Badge>
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      {airline.iata ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-extrabold tabular-nums">{airline.iata}</span>
                            <CopyButton text={airline.iata} />
                          </div>
                          {isHist && airline.iataHistoricalNote ? (
                            <span
                              className="block text-[10px] font-medium text-muted-foreground"
                              title={airline.iataHistoricalNote}
                            >
                              historical
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground" title="No confirmed active IATA designator">
                          Unassigned
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      {airline.icao ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-extrabold tabular-nums">{airline.icao}</span>
                          <CopyButton text={airline.icao} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>

                    <td className="max-w-sm px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                      <p className="text-foreground/90">{airline.notes ?? airline.serviceScope}</p>
                      {hubs.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-muted-foreground">Hubs:</span>
                          {hubs.map((h) => (
                            <Link
                              key={h.slug}
                              href={`/airports/${h.slug}`}
                              className="inline-flex items-center rounded border bg-secondary/40 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary"
                            >
                              {h.city} ({h.code})
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {airline.lastVerified}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No airline in our {airlines.length}-carrier directory matched “{q}”
          {statusFilter !== "all" ? ` under the ${statusFilter} filter` : ""}. Try searching by airline name (e.g.{" "}
          <code>Air Peace</code>, <code>Ibom Air</code>, <code>Nigeria Airways</code>) or designator (<code>P4</code>,{" "}
          <code>QI</code>, <code>U5</code>, <code>APK</code>, <code>WT</code>).
        </div>
      )}
    </div>
  );
}
