"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  operatorSegmentLabel,
  operatorTypeLabel,
  operatorTypeShortLabel,
  type OilGasOperator,
  type OperatorSegment,
  type OperatorType,
} from "@/lib/oil-gas";

type TypeFilter = "all" | OperatorType;
type SegmentFilter = "all" | OperatorSegment;

export function OperatorsSearch({ operators }: { operators: OilGasOperator[] }) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");

  const counts = useMemo(() => {
    let noc = 0;
    let ioc = 0;
    let jv = 0;
    let independent = 0;
    let upstream = 0;
    let midstream = 0;
    let downstream = 0;
    let integrated = 0;

    for (const op of operators) {
      if (op.type === "noc") noc += 1;
      else if (op.type === "ioc") ioc += 1;
      else if (op.type === "jv") jv += 1;
      else if (op.type === "independent") independent += 1;

      if (op.segment === "upstream") upstream += 1;
      else if (op.segment === "midstream") midstream += 1;
      else if (op.segment === "downstream") downstream += 1;
      else if (op.segment === "integrated") integrated += 1;
    }

    return {
      all: operators.length,
      noc,
      ioc,
      jv,
      independent,
      upstream,
      midstream,
      downstream,
      integrated,
    };
  }, [operators]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return operators.filter((op) => {
      if (typeFilter !== "all" && op.type !== typeFilter) return false;
      if (segmentFilter !== "all" && op.segment !== segmentFilter) return false;
      if (!needle) return true;

      const hay = [
        op.name,
        op.fullLegalName ?? "",
        ...(op.alternateNames ?? []),
        op.type ?? "",
        operatorTypeLabel(op.type),
        op.segment ?? "",
        op.focusSummary ?? "",
        op.headquartersCity ?? "",
        op.headquartersLocality ?? "",
        op.stateName ?? "",
        ...(op.operationalHubs ?? []),
        op.slug.replace(/-/g, " "),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(needle);
    });
  }, [operators, q, typeFilter, segmentFilter]);

  const hasFilters = q.trim().length > 0 || typeFilter !== "all" || segmentFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="block" htmlFor="oil-gas-search">
          <span className="text-sm font-semibold">
            Filter by company, former name (SPDC, MPNU, NAOC, Forte Oil, NDEP), asset or HQ city
          </span>
          <input
            id="oil-gas-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. NNPC, Shell, SPDC, Renaissance, Seplat, NLNG, Agip, Dangote, Port Harcourt…"
            className="mt-1 w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by operator ownership type">
            {(
              [
                { id: "all", label: `All types (${counts.all})` },
                { id: "noc", label: `NOC (${counts.noc})` },
                { id: "ioc", label: `IOC (${counts.ioc})` },
                { id: "jv", label: `LNG JV (${counts.jv})` },
                { id: "independent", label: `Indigenous (${counts.independent})` },
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

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by petroleum value-chain focus">
            {(
              [
                { id: "all", label: "All segments" },
                { id: "upstream", label: `Upstream (${counts.upstream})` },
                { id: "midstream", label: `Midstream (${counts.midstream})` },
                { id: "downstream", label: `Downstream (${counts.downstream})` },
                { id: "integrated", label: `Integrated (${counts.integrated})` },
              ] as const
            ).map((opt) => {
              const active = segmentFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSegmentFilter(opt.id)}
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
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {operators.length} verified major oil &amp; gas operators in Nigeria
        {typeFilter !== "all" ? ` · ${operatorTypeLabel(typeFilter)}` : ""}
        {segmentFilter !== "all" ? ` · ${operatorSegmentLabel(segmentFilter)}` : ""}
        {q.trim() ? ` matching “${q.trim()}”` : ""}.
      </p>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Operator
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Type
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Focus
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  HQ city
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((op) => {
                const badgeVariant = op.type === "noc" || op.type === "ioc" ? "accent" : "outline";
                return (
                  <tr key={op.slug} className="align-top transition-colors hover:bg-card/60">
                    <td className="px-3 py-3">
                      <Link
                        href={`/oil-gas/${op.slug}`}
                        className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {op.name}
                      </Link>
                      {op.fullLegalName && op.fullLegalName !== op.name ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">{op.fullLegalName}</div>
                      ) : null}
                      {op.alternateNames && op.alternateNames.length > 0 ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground/90">
                          Aliases: {op.alternateNames.slice(0, 4).join(" · ")}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap">
                      {op.type ? (
                        <Badge variant={badgeVariant} title={operatorTypeLabel(op.type)}>
                          {operatorTypeShortLabel(op.type)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">{operatorSegmentLabel(op.segment)}</div>
                      {op.focusSummary ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">{op.focusSummary}</div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3">
                      {op.headquartersCity ? (
                        <div>
                          <span className="font-medium">{op.headquartersCity}</span>
                          {op.stateSlug && op.stateName ? (
                            <div className="text-xs text-muted-foreground">
                              <Link
                                href={`/geo/${op.stateSlug}`}
                                className="underline-offset-2 hover:text-primary hover:underline"
                              >
                                {op.stateName}
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {op.lastVerified}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>
            No operator in our verified 16-company reference matched{" "}
            {q.trim() ? <span className="font-semibold">“{q.trim()}”</span> : "the active filter"}.
          </p>
          <p className="mt-1 text-xs">
            Our static directory covers major upstream, LNG, refining, and nationwide downstream operators — not every
            retail filling-station brand or oilfield contractor.
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setTypeFilter("all");
                setSegmentFilter("all");
              }}
              className="mt-3 inline-flex min-h-11 items-center rounded-full border px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
            >
              Reset all filters
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
