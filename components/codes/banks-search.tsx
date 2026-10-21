"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Bank } from "@/lib/banks";
import { CopyButton } from "@/components/codes/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BanksSearch({ banks }: { banks: Bank[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return banks;
    return banks.filter((b) => {
      const hay = [
        b.name,
        b.fullName ?? "",
        b.slug,
        ...b.sortCodes.map((s) => s.code),
        ...b.ussd.map((u) => u.code),
      ].join(" ").toLowerCase();
      return hay.includes(needle);
    });
  }, [banks, q]);

  return (
    <div className="space-y-4">
      <label className="block" htmlFor="banks-search">
        <span className="text-sm font-semibold">Search banks</span>
        <input
          id="banks-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, USSD (e.g. *737#) or sort code (e.g. 058)"
          className="mt-1 w-full rounded-full border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {filtered.length} of {banks.length} banks{q.trim() ? ` for "${q.trim()}"` : ""}. Sorted A–Z.
      </p>

      <ul className="grid gap-3">
        {filtered.map((bank) => {
          const mainSort = bank.sortCodes.find((s) => s.type === "nip") ?? bank.sortCodes[0];
          const mainUssd = bank.ussd[0];
          return (
            <li key={bank.slug}>
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        <Link href={`/codes/banks/${bank.slug}`} className="underline-offset-2 hover:text-primary hover:underline">
                          {bank.name}
                        </Link>
                      </CardTitle>
                      {bank.fullName ? <p className="text-xs text-muted-foreground">{bank.fullName}</p> : null}
                    </div>
                    <Badge variant="accent">CBN code {mainSort.code}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-bold">{mainSort.code}</span>
                    <span className="text-xs text-muted-foreground">{mainSort.label}</span>
                    <CopyButton text={mainSort.code} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-bold">{mainUssd.code}</span>
                    <span className="text-xs text-muted-foreground">{mainUssd.label}</span>
                    <CopyButton text={mainUssd.code} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/codes/banks/${bank.slug}`}
                      className="inline-flex min-h-11 items-center rounded-full border bg-background px-4 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                    >
                      Open {bank.name} — full codes & sources →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
        {!filtered.length ? <li className="rounded-xl border bg-card/40 p-6 text-center text-sm text-muted-foreground">No banks match “{q.trim()}”. Try another name or code.</li> : null}
      </ul>
    </div>
  );
}
