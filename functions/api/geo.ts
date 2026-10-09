/**
 * Cloudflare Pages Function: returns the visitor's network location (country, region, timezone).
 * Cloudflare fills `request.cf` at the edge. Nothing is stored, and the response is private to the browser.
 * Served at /api/geo on the deployed site. It is not part of the static export.
 */
type CfProps = { country?: string; region?: string; city?: string; timezone?: string };

export const onRequestGet = async (context: { request: Request }): Promise<Response> => {
  const cf = ((context.request as Request & { cf?: CfProps }).cf ?? {}) as CfProps;
  return new Response(
    JSON.stringify({
      country: cf.country ?? null,
      region: cf.region ?? null,
      city: cf.city ?? null,
      timezone: cf.timezone ?? null,
    }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "private, max-age=600",
      },
    },
  );
};
