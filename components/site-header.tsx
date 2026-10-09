import Image from "next/image";
import Link from "next/link";
import { SITE_CONFIG, SITE_TAGLINE } from "@/config/site";
import { SearchBar } from "@/components/search-bar";
import { ThemeToggle } from "@/components/theme-toggle";
import { TOP_NAV } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Row 1: brand, centred search (desktop), theme toggle */}
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${SITE_CONFIG.name} home`}>
          <Image src="/logo.svg" alt="" width={36} height={36} priority className="size-9" />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-lg font-extrabold tracking-tight">{SITE_CONFIG.name}</span>
            <span className="mt-1 text-[11px] text-muted-foreground">{SITE_TAGLINE}</span>
          </span>
        </Link>

        <div className="hidden flex-1 justify-center md:flex">
          <SearchBar className="max-w-2xl" id="site-search-desktop" />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile search row */}
      <div className="mx-auto max-w-7xl px-4 pb-3 md:hidden">
        <SearchBar id="site-search-mobile" />
      </div>

      {/* Row 2: desktop top navigation */}
      <nav aria-label="Main" className="hidden border-t lg:block">
        <ul className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          {TOP_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-block rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
