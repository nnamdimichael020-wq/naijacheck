"use client";

import * as React from "react";
import { ADSENSE_CLIENT_ID } from "@/config/site";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Google AdSense auto ad unit. Only rendered when NEXT_PUBLIC_ADSENSE_CLIENT is set at build time. */
export function AdsenseUnit() {
  React.useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers or script failures should never break the page.
    }
  }, []);

  return (
    <ins
      className="adsbygoogle block"
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
