"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Entry = { slug: string; name: string; count: number; lgaSlugs: string[]; lgaNames: string[] };
interface Props { states: Entry[] }
export default function GeoSearch({ states }: Props){
  const [q,setQ]=useState("");
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click",h);
    return ()=>document.removeEventListener("click",h);
  },[]);
  const results=useMemo(()=>{
    const t=q.trim().toLowerCase();
    if(!t) return [] as {stateSlug:string; stateName:string; lgaSlug:string; lgaName:string; label:string; href:string}[];
    const out: {stateSlug:string; stateName:string; lgaSlug:string; lgaName:string; label:string; href:string}[]=[];
    for(const s of states){
      for(let i=0;i<s.lgaSlugs.length;i++){
        const name=s.lgaNames[i]; const slug=s.lgaSlugs[i];
        if(name.toLowerCase().includes(t) || slug.includes(t) || s.name.toLowerCase().includes(t)){
          out.push({stateSlug:s.slug, stateName:s.name, lgaSlug:slug, lgaName:name, label:`${name} — ${s.name}`, href:`/geo/${s.slug}/${slug}`});
          if(out.length>=14) break;
        }
      }
      if(out.length>=14) break;
    }
    return out;
  },[q,states]);
  return (
    <div ref={ref} className="relative">
      <input value={q} onChange={e=>{setQ(e.target.value); setOpen(true);}} onFocus={()=>setOpen(true)} placeholder="Search 774 LGAs — e.g. Ikeja, Chikun, Gwarzo…" className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/20" />
      {open && q.trim() && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-auto rounded-2xl border border-border bg-background shadow-lg">
          {results.length===0? <div className="px-4 py-3 text-sm text-muted-foreground">No match — try state or LGA name.</div> : results.map(r=>(
            <Link key={r.href} href={r.href} onClick={()=>setOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50">
              <span>{r.lgaName} <span className="text-muted-foreground">({r.stateName})</span></span><span className="text-xs text-muted-foreground">{r.stateSlug}/{r.lgaSlug}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
