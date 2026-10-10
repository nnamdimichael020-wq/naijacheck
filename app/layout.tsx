import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { SITE_CONFIG, SITE_TAGLINE, ADSENSE_CLIENT_ID } from "@/config/site";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SiteSidebar } from "@/components/site-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { LiveTicker } from "@/components/live/ticker";
import { JsonLd } from "@/components/json-ld";
import { PwaClient } from "@/components/pwa-client";
import { PushPrompt } from "@/components/push-notifications";
import { organizationSchema, websiteSchema } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name}: ${SITE_TAGLINE}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  applicationName: SITE_CONFIG.name,
  keywords: [
    "naija prices today",
    "food prices nigeria 2026",
    "black market dollar rate",
    "naija slang meaning",
    "hustle ideas nigeria",
    "JAMB cut off 2026",
    "GovHowTo Nigeria",
    "data plans nigeria",
  ],
  authors: [{ name: SITE_CONFIG.name, url: SITE_CONFIG.url }],
  creator: SITE_CONFIG.name,
  publisher: SITE_CONFIG.name,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name}: ${SITE_TAGLINE}`,
    description: SITE_CONFIG.description,
    locale: "en_NG",
  },
  twitter: { card: "summary_large_image", title: SITE_CONFIG.name, description: SITE_CONFIG.description },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a1a12" },
    { media: "(prefers-color-scheme: light)", color: "#008751" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Skip to content
          </a>
          <PwaClient />
          <SiteHeader />
          <LiveTicker />
          <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 lg:px-6">
            <main id="main" className="min-w-0 flex-1 pb-28 pt-6 lg:pb-12">
              {children}
            </main>
            <aside className="hidden w-[300px] shrink-0 pt-6 lg:block" aria-label="Sidebar">
              <SiteSidebar />
            </aside>
          </div>
          <SiteFooter />
          <BottomNav />
          <PushPrompt />
        </ThemeProvider>
        <JsonLd data={[organizationSchema, websiteSchema]} />
        {ADSENSE_CLIENT_ID ? (
          <Script
            id="adsense"
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          />
        ) : null}
      </body>
    </html>
  );
}
