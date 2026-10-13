/**
 * Cloudflare Worker entry point for the static Next.js export.
 * Static files are served from ./out by Workers Static Assets. Dynamic API
 * responses are deliberately no-store.
 *
 * Alerts (Web Push and Telegram) run from the same scheduled handler and the
 * same genuine-change decision. Both remain unavailable until the owner binds
 * KV and adds the relevant secrets; unconfigured channels are a silent no-op.
 * See `docs/runbooks/web-push-owner-setup.md` and `docs/runbooks/telegram-owner-setup.md`.
 */
import { handlePushRequest, runAlertMonitor, type PushEnv } from "./push";
import { handleTelegramRequest } from "./telegram";

type CloudflareLocation = {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
};

type RequestWithCloudflare = Request & { cf?: CloudflareLocation };

type Env = PushEnv & {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
};

function locationResponse(request: RequestWithCloudflare): Response {
  const location = request.cf ?? {};
  const body = JSON.stringify({
    country: location.country ?? null,
    region: location.region ?? null,
    city: location.city ?? null,
    timezone: location.timezone ?? null,
  });

  return new Response(request.method === "HEAD" ? null : body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/geo") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response(null, {
          status: 405,
          headers: { allow: "GET, HEAD", "cache-control": "no-store" },
        });
      }
      return locationResponse(request as RequestWithCloudflare);
    }

    const pushResponse = await handlePushRequest(request, env);
    if (pushResponse) return pushResponse;

    const telegramResponse = await handleTelegramRequest(request, env);
    if (telegramResponse) return telegramResponse;

    if (pathname.startsWith("/api/")) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    // One run, one decision, both channels. Missing secrets or a missing KV
    // binding log and return; they never fail the scheduled invocation.
    await runAlertMonitor(env);
  },
};

export default worker;
