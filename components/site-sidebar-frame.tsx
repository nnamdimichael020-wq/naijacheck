"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** The quiz is a focused, ad-free activity; keep the usual rail on every other page. */
export function SiteSidebarFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/tools/quiz") return null;
  return (
    <aside className="hidden w-[300px] shrink-0 pt-6 lg:block" aria-label="Sidebar">
      {children}
    </aside>
  );
}
