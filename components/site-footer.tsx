import Link from "next/link";
import { SITE_CONFIG, SITE_TAGLINE, SOCIAL_HANDLE } from "@/config/site";
import { AdSlot } from "@/components/ads/ad-slot";
import { TOP_NAV } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <AdSlot variant="footer" />
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-lg font-extrabold">{SITE_CONFIG.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{SITE_TAGLINE}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Prices are indicative unless a source is cited. Always confirm before you spend. {SOCIAL_HANDLE}
            </p>
          </div>
          <nav aria-label="Footer">
            <p className="mb-2 text-sm font-semibold">Sections</p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {TOP_NAV.map((item) => (
                <li key={item.href}>
                  <Link className="text-muted-foreground hover:text-foreground" href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Company">
            <p className="mb-2 text-sm font-semibold">Company</p>
            <ul className="space-y-1 text-sm">
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href="/about">
                  About NaijaCheck
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href="/privacy">
                  Privacy and NDPA 2023
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground" href="/sitemap.xml">
                  Sitemap
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SITE_CONFIG.name} ({SITE_CONFIG.domain}). Not financial, legal or medical advice.
        </p>
      </div>
    </footer>
  );
}
