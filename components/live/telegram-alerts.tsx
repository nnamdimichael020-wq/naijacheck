import { SITE_CONFIG } from "@/config/site";

/**
 * Non-intrusive pointer to the optional public Telegram alerts channel.
 *
 * Both exports render nothing when `SITE_CONFIG.telegramChannelUrl` is empty
 * (the default until the owner creates the channel), so the site never shows a
 * dead or placeholder link. There is no login, widget, iframe or script here:
 * the channel is an ordinary outbound link to Telegram, and the site sends
 * nothing about the visitor.
 */

const LINK_TEXT = "Get alerts on Telegram";

function TelegramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor">
      <path d="M21.7 3.3a1.4 1.4 0 0 0-1.5-.2L2.9 10.3c-.6.2-1 .8-1 1.4 0 .7.5 1.2 1.1 1.4l3.9 1.2 1.5 4.6c.2.6.7 1 1.3 1h.1c.6 0 1.1-.3 1.4-.8l2-3.1 3.6 2.7c.3.2.6.3.9.3l.5-.1c.5-.2.8-.6.9-1.1l2.6-13.9c.1-.6-.1-1.2-.6-1.5Zm-4.9 3.2-6.6 6.1c-.2.2-.4.5-.4.8l-.2 2.1-1-3 .1-.2 8.1-5.8Z" />
    </svg>
  );
}

/** Inline link for the footer. Hidden until the owner configures a channel. */
export function TelegramAlertsLink({ className = "" }: { className?: string }) {
  const url = SITE_CONFIG.telegramChannelUrl;
  if (!url) return null;
  return (
    <a
      className={`inline-flex items-center gap-1.5 font-medium text-primary hover:underline ${className}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <TelegramIcon />
      {LINK_TEXT}
    </a>
  );
}

/** Short section for /status, placed next to the Web Push settings. Hidden until configured. */
export function TelegramAlerts() {
  const url = SITE_CONFIG.telegramChannelUrl;
  if (!url) return null;
  return (
    <section aria-labelledby="telegram-alerts-title" className="rounded-xl border p-4">
      <h2 id="telegram-alerts-title" className="text-lg font-bold">
        Alerts on Telegram
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The public {SITE_CONFIG.name} alerts channel posts the same verified messages as Web Push, from one shared decision: a healthy source, a
        newer source time, a genuine movement (parallel USD by at least ₦5, or a changed depot petrol median), and at most one alert burst every
        six hours. No first-reading, failed-monitor or unchanged reading is ever posted.
      </p>
      <p className="mt-3">
        <TelegramAlertsLink className="text-sm" />
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Telegram is an external service. This site opens an ordinary link: no Telegram login happens here, nothing about you is sent to this site,
        and no tracking widget is embedded.
      </p>
    </section>
  );
}
