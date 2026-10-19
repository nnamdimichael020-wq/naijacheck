"use client";

import { usePathname } from "next/navigation";
import { SiteSidebar } from "@/components/site-sidebar";

/** The quiz is a focused, ad-free activity; keep the usual rail on every other page. */
export function SiteSidebarFrame() {
  const pathname = usePathname();
  if (pathname === "/tools/quiz") return null;
  return (
    <aside className="hidden w-[300px] shrink-0 pt-6 lg:block" aria-label="Sidebar">
      <SiteSidebar />
    </aside>
  );
}
