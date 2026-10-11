"use client";

import * as React from "react";
import { Download, Share, Smartphone, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const INSTALL_TIP_DISMISS_KEY = "naijacheck:install-tip-dismissed-until:v1";
export const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type PlatformHint = "ios" | "android" | "generic";

function detectMobilePlatform(): { platform: PlatformHint; isStandalone: boolean } {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { platform: "generic", isStandalone: false };
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1);
  const isAndroid = /Android/i.test(ua);
  let isStandalone = false;
  try {
    isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    isStandalone = false;
  }
  return {
    platform: isIOS ? "ios" : isAndroid ? "android" : "generic",
    isStandalone,
  };
}

/**
 * Dismissible, non-blocking mobile install / Add-to-Home-Screen tip.
 * - Remembers dismissal in localStorage for 14 days.
 * - Never calls Notification.requestPermission on page load (or ever).
 * - Inline layout so it never overlaps BottomNav or PushPrompt.
 */
export function InstallTip({ className }: { className?: string }) {
  const [dismissed, setDismissed] = React.useState(false);
  const [platform, setPlatform] = React.useState<PlatformHint>("generic");
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    const info = detectMobilePlatform();
    setPlatform(info.platform);
    if (info.isStandalone) {
      setDismissed(true);
      return;
    }
    try {
      const until = Number(window.localStorage.getItem(INSTALL_TIP_DISMISS_KEY) ?? "0");
      if (Number.isFinite(until) && until > Date.now()) {
        setDismissed(true);
        return;
      }
    } catch {
      /* storage unavailable in private browsing */
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismissFor14Days = () => {
    try {
      window.localStorage.setItem(INSTALL_TIP_DISMISS_KEY, String(Date.now() + FOURTEEN_DAYS_MS));
    } catch {
      /* ignore private-mode write error */
    }
    setDismissed(true);
  };

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDismissed(true);
      }
    } catch {
      /* ignore cancelled prompt */
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (dismissed) return null;

  return (
    <aside
      aria-label="Install NaijaCheck on your phone"
      className={cn(
        "rounded-xl border border-primary/25 bg-secondary/50 p-3 text-xs shadow-sm sm:p-3.5 lg:hidden",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Smartphone className="size-3.5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-bold text-foreground">
              Save NaijaCheck to your phone&apos;s Home Screen
            </p>
            <p className="leading-relaxed text-muted-foreground">
              <span className={cn(platform === "ios" && "font-semibold text-foreground")}>
                <Share className="mr-1 inline size-3 align-[-1px]" aria-hidden="true" />
                <strong>iPhone / iPad (iOS):</strong> tap <strong>Share</strong> → <strong>Add to Home Screen</strong>.
              </span>{" "}
              <span className={cn(platform === "android" && "font-semibold text-foreground")}>
                <strong>Android:</strong> tap browser menu <strong>(⋮)</strong> → <strong>Install app</strong> or{" "}
                <strong>Add to Home screen</strong>.
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={triggerInstall}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="size-3" aria-hidden="true" />
                  Install app
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismissFor14Days}
                className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Hide for 14 days
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissFor14Days}
          aria-label="Dismiss install tip for 14 days"
          className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
