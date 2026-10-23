"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { bankLicenceTierShort, type Bank } from "@/lib/banks";
import { CopyButton } from "@/components/codes/copy-button";
import { Badge } from "@/components/ui/badge";

type TierFilter = "all" | "International" | "National";

export function BanksSearch({ banks }: { banks: Bank[] }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<TierFilter>("all");

  const counts = useMemo(() => {
    let intl = 0;
    let natl = 0;
    for (const b of banks) {
      const t = bankLicenceTierShort(b.licenceType);
      if (t === "International") intl += 1;
      else if (t === "National") natl += 1;
    }
    return { all: banks.length, intl, natl };
  }, [banks]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return banks.filter((b) => {
      if (tier !== "all" && bankLicenceTierShort(b.licenceType) !== tier) {
        return false;
      }
      if (!needle) return true;
      const hay = [
        b.name,
        b.fullName ?? "",
        b.fullLegalName ?? "",
        b.parentGroup ?? "",
        b.headquarters ?? "",
        b.headquartersCity ?? "",
        b.licenceType ?? "",
        b.slug,
        ...b.sortCodes.map((s) => s.code),
        ...b.ussd.map((u) => u.code),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [banks, q, tier]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block flex-1" htmlFor="banks-search">
          <span className="text-sm font-semibold">Filter by bank, code, USSD or HQ area</span>
          <input
            id="banks-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. GTBank, 058, *737#, Marina, Victoria Island, International…"
            className="mt-1 w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by CBN commercial bank licence tier">
          {(
            [
              { id: "all", label: `All (${counts.all})` },
              { id: "International", label: `International (${counts.intl})` },
              { id: "National", label: `National (${counts.natl})` },
            ] as const
          ).map((opt) => {
            const active = tier === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTier(opt.id)}
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
        Showing {filtered.length} of {banks.length} commercial banks
        {tier !== "all" ? ` (${tier.toLowerCase()} authorisation)` : ""}
        {q.trim() ? ` matching “${q.trim()}”` : ""}. Sorted A–Z.
      </p>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Bank
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Sort code(s)
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Primary USSD
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  HQ &amp; CBN licence
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Verified
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((bank) => {
                const mainSort = bank.sortCodes.find((s) => s.type === "nip") ?? bank.sortCodes[0];
                const headOfficeSort = bank.sortCodes.find((s) => s.type === "head-office");
                const mainUssd = bank.ussd[0];
                const tierLabel = bankLicenceTierShort(bank.licenceType);
                return (
                  <tr key={bank.slug} className="align-top transition-colors hover:bg-card/60">
                    <td className="px-3 py-3">
                      <Link
                        href={`/codes/banks/${bank.slug}`}
                        className="font-bold text-foreground underline-offset-2 hover:text-primary hover:underline"
                      >
                        {bank.name}
                      </Link>
                      {bank.fullLegalName ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{bank.fullLegalName}</p>
                      ) : bank.fullName ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{bank.fullName}</p>
                      ) : null}
                      <Link
                        href={`/codes/banks/${bank.slug}`}
                        className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline"
                      >
                        All {bank.ussd.length} USSD &amp; HQ details →
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold tabular-nums">{mainSort.code}</span>
                        <CopyButton text={mainSort.code} />
                      </div>
                      {headOfficeSort ? (
                        <p className="mt-1 font-mono text-xs text-muted-foreground tabular-nums">
                          HQ cheque: {headOfficeSort.code}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-extrabold">{mainUssd.code}</span>
                        <CopyButton text={mainUssd.code} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{mainUssd.label}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-xs font-medium text-foreground">
                        {bank.headquartersCity ?? "unverified"}
                      </p>
                      <div className="mt-1">
                        <Badge variant={tierLabel === "International" ? "accent" : "outline"} className="text-[11px]">
                          {tierLabel === "Unverified" ? "unverified" : `${tierLabel} licence`}
                        </Badge>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-muted-foreground tabular-nums">
                      {bank.lastVerified}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          No commercial banks in this directory match “{q.trim()}”
          {tier !== "all" ? ` under ${tier} authorisation` : ""}. Clear the filter or try a 3-digit sort code (e.g.{" "}
          <code>058</code>) or USSD (<code>*737#</code>).
        </div>
      )}
    </div>
  );
}
