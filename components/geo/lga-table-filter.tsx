"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
type Lga = { slug: string; name: string; headquarters?: string };
export default function LgaTableFilter({ stateSlug, lgas }: { stateSlug: string; lgas: Lga[] }){
  const [q,setQ]=useState("");
  const filtered=useMemo(()=>{
    const t=q.trim().toLowerCase();
    if(!t) return lgas;
    return lgas.filter(l=> l.name.toLowerCase().includes(t) || l.slug.includes(t) || (l.headquarters||"").toLowerCase().includes(t));
  },[q,lgas]);
  return (
    <div className="space-y-3">
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter LGAs in this state…" className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/20" />
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3">LGA</th><th className="py-2 pr-3">Headquarters</th><th className="py-2">Links</th></tr></thead>
          <tbody>
            {filtered.map(l=>(
              <tr key={l.slug} className="border-b last:border-0">
                <td className="py-2.5 pr-3 font-medium"><Link href={`/geo/${stateSlug}/${l.slug}`} className="underline decoration-muted-foreground/30 underline-offset-4 hover:decoration-foreground">{l.name}</Link></td>
                <td className="py-2.5 pr-3 text-muted-foreground">{l.headquarters ?? "—"}</td>
                <td className="py-2.5"><Link href={`/geo/${stateSlug}/${l.slug}`} className="text-xs rounded-full border border-border px-2.5 py-1 hover:bg-muted">Open →</Link></td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No LGA matches “{q}”.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
