"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  formatUnLocodeSpaced,
  portCategoryLabel,
  portCategoryShortLabel,
  type NigerianPort,
  type PortCategory,
} from "@/lib/ports";
import { CopyButton } from "@/components/codes/copy-button";
import { Badge } from "@/components/ui/badge";

type CategoryFilter = "all" | "commercial-all" | PortCategory;

export function PortsSearch({ ports }: { ports: NigerianPort[] }) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const counts = useMemo(() => {
    let commercialAll = 0;
    let deepSea = 0;
    let energy = 0;
    for (const p of ports) {
      if (p.category === "energy-terminal") {
        energy += 1;
      } else {
        commercialAll += 1;
        if (p.category === "deep-sea-port") deepSea += 1;
      }
    }
    return {
      all: ports.length,
      commercialAll,
      deepSea,
      energy,
    };
  }, [ports]);

  const filtered = useMemo(() => {
    const rawNeedle = q.trim().toLowerCase();
    const compactNeedle = rawNeedle.replace(/\s+/g, "");
    return ports.filter((p) => {
      if (categoryFilter === "commercial-all") {
        if (p.category === "energy-terminal") return false;
      } else if (categoryFilter !== "all" && p.category !== categoryFilter) {
        return false;
      }

      if (!rawNeedle) return true;

      const spacedCode = formatUnLocodeSpaced(p.unLocode) ?? "";
      const hay = [
        p.name,
        ...(p.alternateNames ?? []),
        ...(p.subPortCodes ?? []),
        p.city ?? "",
        p.locality ?? "",
        p.stateName,
        p.lgaName ?? "",
        p.unLocode ?? "",
        spacedCode,
        p.npaZone ?? "",
        p.operator ?? "",
        ...(p.terminalOperators ?? []),
        p.role ?? "",
        ...(p.cargoTypes ?? []),
        p.slug.replace(/-/g, " "),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(rawNeedle) || (compactNeedle.length >= 3 && hay.replace(/\s+/g, "").includes(compactNeedle));
    });
  }, [ports, q, categoryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="block flex-1" htmlFor="ports-search">
          <span className="text-sm font-semibold">
            Filter by port, alias, city, coastal state, UN/LOCODE or terminal operator
          </span>
          <input
            id="ports-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. Apapa, Tin Can, Lekki, Onne, NGAPP, NGLKK, Warri, Calabar, Bonny, WACT…"
            className="mt-1 w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by port category">
          {(
            [
              { id: "all", label: `All (${counts.all})` },
              { id: "commercial-all", label: `NPA Commercial & Deep-Sea (${counts.commercialAll})` },
              { id: "deep-sea-port", label: `Deep-Sea (${counts.deepSea})` },
              { id: "energy-terminal", label: `Energy Terminals (${counts.energy})` },
            ] as const
          ).map((opt) => {
            const active = categoryFilter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCategoryFilter(opt.id)}
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
        Showing {filtered.length} of {ports.length} verified Nigerian seaports &amp; major marine terminals
        {q.trim() ? ` matching “${q.trim()}”` : ""}. Commercial &amp; deep-sea ports listed ahead of hydrocarbon export terminals.
      </p>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[740px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Port / Marine Terminal
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  State / City
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Type / Role
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  UN/LOCODE
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  lastVerified
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((port) => {
                const spaced = formatUnLocodeSpaced(port.unLocode);
                const badgeVariant =
                  port.category === "deep-sea-port"
                    ? "accent"
                    : port.category === "commercial-seaport"
                      ? "default"
                      : "outline";

                return (
                  <tr key={port.slug} className="align-top transition-colors hover:bg-card/60">
                    <td className="px-3 py-3">
                      <Link
                        href={`/ports/${port.slug}`}
                        className="font-bold text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {port.name}
                      </Link>
                      {port.alternateNames && port.alternateNames.length > 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Also searched as:{" "}
                          {port.alternateNames
                            .filter((alias) => !/^NG\s?[A-Z]{3}$/.test(alias))
                            .slice(0, 3)
                            .join(" · ")}
                        </p>
                      ) : null}
                      <Link
                        href={`/ports/${port.slug}`}
                        className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        Terminals, operators &amp; sources →
                      </Link>
                    </td>

                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">{port.city ?? port.stateName}</p>
                      <Link
                        href={`/geo/${port.stateSlug}`}
                        className="mt-0.5 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {port.stateName} State
                        {port.lgaName ? ` · ${port.lgaName} LGA` : ""}
                      </Link>
                      {port.npaZone ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{port.npaZone}</p>
                      ) : null}
                    </td>

                    <td className="px-3 py-3 max-w-[270px]">
                      <Badge variant={badgeVariant} className="text-[11px]">
                        {portCategoryShortLabel(port.category)}
                      </Badge>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {port.role ?? portCategoryLabel(port.category)}
                      </p>
                    </td>

                    <td className="px-3 py-3">
                      {port.unLocode ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-extrabold tabular-nums">
                              {port.unLocode}
                            </span>
                            <CopyButton text={port.unLocode} />
                          </div>
                          {spaced ? (
                            <p className="font-mono text-[11px] text-muted-foreground">UNECE: {spaced}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>

                    <td className="px-3 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {port.lastVerified}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No port in our {ports.length}-entry maritime directory matched “{q}”. Try searching by common alias (
          <code>Apapa</code>, <code>Tin Can</code>, <code>Lekki</code>, <code>Onne</code>, <code>Warri</code>,{" "}
          <code>Calabar</code>, <code>Bonny</code>), UN/LOCODE (<code>NGAPP</code>, <code>NGLKK</code>,{" "}
          <code>NGONN</code>), or switch the category filter back to <strong>All ({counts.all})</strong>.
        </div>
      )}
    </div>
  );
}
