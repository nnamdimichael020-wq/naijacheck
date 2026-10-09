/**
 * Cloudflare Worker entry point for the static Next.js export.
 * Static files are served from ./out by Workers Static Assets. Only /api/* is
 * routed through this Worker; /api/geo uses Cloudflare's request.cf location
 * metadata and is deliberately not cached because the response is visitor-specific.
 */
type CloudflareLocation = {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
};

type RequestWithCloudflare = Request & { cf?: CloudflareLocation };

type Env = {
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

    if (pathname.startsWith("/api/")) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
