"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { BOTTOM_NAV, MORE_NAV, isActivePath } from "@/lib/nav";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/** Mobile-only bottom bar: five destinations plus a "More" sheet. Hidden on lg and up. */
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const moreActive = MORE_NAV.some((m) => isActivePath(pathname, m.href));

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-6">
        {BOTTOM_NAV.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet>
            <SheetTrigger
              className={cn(
                "flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                moreActive ? "text-primary" : "text-muted-foreground",
              )}
              aria-label="More sections"
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
              More
            </SheetTrigger>
            <SheetContent>
              <SheetTitle className="mb-1 text-lg font-bold">More from NaijaCheck</SheetTitle>
              <SheetDescription className="mb-4 text-sm text-muted-foreground">Guides, exams and the fine print.</SheetDescription>
              <ul className="grid grid-cols-2 gap-2">
                {MORE_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className="flex items-center gap-3 rounded-lg border p-4 font-medium hover:bg-secondary">
                        <Icon className="size-5 text-primary" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <Link href="/telecom" className="mt-3 block rounded-lg border p-4 text-center font-medium hover:bg-secondary">
                Telecom and data plans
              </Link>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
