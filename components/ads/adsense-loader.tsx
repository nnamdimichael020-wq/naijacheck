"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { ADSENSE_CLIENT_ID } from "@/config/site";

/** Keep AdSense auto placements off the focused quiz flow. */
export function AdsenseLoader() {
  const pathname = usePathname();
  if (!ADSENSE_CLIENT_ID || pathname === "/tools/quiz") return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
    />
  );
}
