/**
 * Telegram delivery for the shared alert decision in `alerts.ts`.
 *
 * Free path only: the official Telegram Bot API `sendMessage` endpoint. No paid
 * bot service, no SaaS, no widget. The bot token and chat id are read from the
 * Worker environment (Cloudflare encrypted secrets) and are never logged,
 * returned in a response, or written to this repository.
 *
 * If the secrets are missing or malformed the module is a silent no-op: it logs
 * `telegram not configured ...` and returns without calling fetch, so a deploy
 * or cron run can never fail because Telegram is unset.
 */
import { alertUrl, formatDelta, formatSourceTime, jsonResponse, type AlertDeps, type AlertPayload } from "./alerts";

export type TelegramEnv = {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  ALERT_SITE_URL?: string;
};

export type TelegramAdminEnv = TelegramEnv & {
  /** Same owner token that protects `POST /api/push/test`; never sent to browsers. */
  PUSH_ADMIN_TOKEN?: string;
};

export type TelegramConfig = {
  configured: boolean;
  reason?: "missing_bot_token" | "missing_chat_id" | "invalid_bot_token" | "invalid_chat_id";
};

export type TelegramSendResult = {
  ok: boolean;
  status: number;
  skipped?: boolean;
  code?: string;
};

/** BotFather tokens look like `123456789:AA...` (>=30 characters after the colon). */
const BOT_TOKEN_PATTERN = /^\d{6,12}:[A-Za-z0-9_-]{30,}$/;
/** A public channel `@name`, a private channel invite id, or a numeric chat id. */
const CHAT_ID_PATTERN = /^(?:@[A-Za-z0-9_]{5,64}|-?\d{5,20})$/;
const TELEGRAM_MAX_TEXT = 4096;
const TELEGRAM_API = "https://api.telegram.org";

/** Validation only — never prints or returns the secret values themselves. */
export function telegramConfiguration(env: TelegramEnv): TelegramConfig {
  const token = (env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const chatId = (env.TELEGRAM_CHAT_ID ?? "").trim();
  if (!token) return { configured: false, reason: "missing_bot_token" };
  if (!BOT_TOKEN_PATTERN.test(token)) return { configured: false, reason: "invalid_bot_token" };
  if (!chatId) return { configured: false, reason: "missing_chat_id" };
  if (!CHAT_ID_PATTERN.test(chatId)) return { configured: false, reason: "invalid_chat_id" };
  return { configured: true };
}

export function telegramConfigured(env: TelegramEnv): boolean {
  return telegramConfiguration(env).configured;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Renders the shared decision as a Telegram message. Contains what changed, the
 * new value, the delta, the source name, the source as-of time and a link back
 * to the live site path. Uses Telegram HTML (not Markdown) so a source label
 * containing `_`, `*` or `[` can never break the send.
 */
export function buildTelegramMessage(payload: AlertPayload): string {
  const lines: string[] = ["🔔 <b>NaijaCheck alert</b>: verified price change", ""];
  for (const change of payload.changes) {
    lines.push(
      `• <b>${escapeHtml(change.label)}</b> moved from ₦${change.from.toLocaleString("en-NG")} to ₦${change.to.toLocaleString("en-NG")} ` +
        `(${formatDelta(change.delta)}). New value: ₦${change.to.toLocaleString("en-NG")}${escapeHtml(change.unit)}`,
    );
    lines.push(`  Source: ${escapeHtml(change.source)} · as of ${escapeHtml(formatSourceTime(change.asOf))}`);
  }
  lines.push("");
  lines.push(`Source: ${escapeHtml(payload.source)}`);
  lines.push(`As of: ${escapeHtml(formatSourceTime(payload.asOf))}`);
  lines.push(`Full status and sources: <a href="${escapeHtml(payload.url)}">${escapeHtml(payload.url)}</a>`);
  lines.push("");
  lines.push(
    "Sent automatically only when a verified reading genuinely changes (parallel USD by at least ₦5, or a changed depot petrol median). Same rule as Web Push; at most one alert burst every 6 hours.",
  );
  const text = lines.join("\n");
  return text.length > TELEGRAM_MAX_TEXT ? `${text.slice(0, TELEGRAM_MAX_TEXT - 1)}…` : text;
}

/** Explicit, clearly-labelled owner test message. Never sent unless a token-bearing owner asks for it. */
export function buildTelegramTestMessage(env: TelegramEnv, now: Date): string {
  const lines = [
    "🔔 <b>NaijaCheck test alert</b>",
    "",
    "This is the owner test send. Real alerts go out only when a monitored reading genuinely changes, and at most once every six hours.",
    `Sent: ${escapeHtml(formatSourceTime(now.toISOString()))}`,
    `Status page: <a href="${escapeHtml(alertUrl(env))}">${escapeHtml(alertUrl(env))}</a>`,
  ];
  return lines.join("\n");
}

/**
 * Sends one message to the configured chat. Failures are logged as sanitized
 * status/codes only — the request URL contains the bot token, so it is never
 * logged, thrown or returned.
 */
export async function sendTelegramAlert(
  env: TelegramEnv,
  payload: AlertPayload,
  deps: AlertDeps = {},
): Promise<TelegramSendResult> {
  return sendTelegramText(env, buildTelegramMessage(payload), deps);
}

async function sendTelegramText(env: TelegramEnv, text: string, deps: AlertDeps = {}): Promise<TelegramSendResult> {
  const config = telegramConfiguration(env);
  if (!config.configured) {
    console.log(`telegram not configured (${config.reason}); no telegram message sent`);
    return { ok: false, status: 0, skipped: true, code: config.reason };
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN!.trim()}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID!.trim(),
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) {
      console.log(`telegram send rejected with HTTP ${response.status}; no retry`);
      return { ok: false, status: response.status, code: "telegram_http_error" };
    }
    const body = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (body && body.ok === false) {
      console.log(`telegram send refused the message (${sanitizeDescription(body.description)})`);
      return { ok: false, status: response.status, code: "telegram_rejected" };
    }
    return { ok: true, status: response.status };
  } catch {
    console.log("telegram send failed (network error); no retry");
    return { ok: false, status: 0, code: "network_error" };
  }
}

/** Telegram descriptions never contain the token, but strip newlines/control characters anyway. */
function sanitizeDescription(description: string | undefined): string {
  if (!description) return "no description";
  return description.replace(/[\r\n\t]+/g, " ").replace(/[^\x20-\x7E]/g, "").slice(0, 120) || "no description";
}

/**
 * Owner-only manual test: `POST /api/telegram/test` with `Authorization: Bearer $PUSH_ADMIN_TOKEN`.
 * Sends exactly one clearly-labelled message. Unconfigured = 503 no-op, never a crash.
 */
export async function handleTelegramRequest(request: Request, env: TelegramAdminEnv, deps: AlertDeps = {}): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (pathname !== "/api/telegram/test") return null;
  if (request.method !== "POST") return jsonResponse({ error: "not_found" }, 404);

  if (!env.PUSH_ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${env.PUSH_ADMIN_TOKEN}`) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const config = telegramConfiguration(env);
  if (!config.configured) {
    console.log(`telegram not configured (${config.reason}); test send skipped`);
    return jsonResponse({ error: "telegram_not_configured", reason: config.reason }, 503);
  }

  const result = await sendTelegramText(env, buildTelegramTestMessage(env, new Date(deps.now?.() ?? Date.now())), deps);
  return jsonResponse({ delivered: result.ok, status: result.status, ...(result.ok ? {} : { error: result.code }) }, result.ok ? 200 : 502);
}
