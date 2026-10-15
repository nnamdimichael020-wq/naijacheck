# Google Search Console owner setup (₦0 plan)

Owner-only, **after** an approved merge and deploy. Everything in this runbook uses the free Google Search Console (GSC) website only — no paid SEO tool, no paid verification, no GSC API key. It does not change DNS, the custom domain, the canonical host, the Worker route, `wrangler.jsonc`, `robots.txt` or the sitemap. The only repository change it may ever cause is one small verification file in `public/`, added by the owner through a normal pull request.

**Honest scope.** Search Console can tell Google the site exists, hand it the sitemap, and let you ask it to look at specific pages. It **cannot** buy, force or guarantee any ranking, and this runbook makes no ranking claims. Anyone who promises a position on Google is guessing. What this procedure produces is *eligibility and visibility*: the pages can be crawled, and you can see what Google did with them.

**No secrets.** GSC never needs a password or API key. The verification file it gives you is **not** a secret: it only proves to Google that you control this site, and it is useless to anyone else. It must still go into Git only as the file described in step 2 — never paste any other account data, screenshots of tokens elsewhere, or cookies into Git, an issue or a chat.

Implementation status right now: **code-side Google-readiness is done and machine-verified; GSC account steps are owner-only.** Verification evidence (counts, commands, negative controls) is recorded in [`../evidence/google-readiness-2026-10-15.md`](../evidence/google-readiness-2026-10-15.md).

## 0. What is already true (verified by `npm run audit:static`, not by hope)

After `npm run build`, the audit enumerates every exported HTML page and fails the build audit unless all of the following hold. You do not need to believe this list — run the commands yourself in section 6.

| Guarantee | Where it lives |
|---|---|
| `/robots.txt` allows every public page (`Allow: /`) | `app/robots.ts` → guard in `scripts/audit-static.mjs` (`robots.ok`) |
| `/robots.txt` disallows `/api/` (the dynamic Worker surface: geo, push, telegram) and `/admin` | same guard (`apiBlocked`, `adminBlocked`) |
| `/robots.txt` advertises exactly `https://naijacheck.ng/sitemap.xml` — the committed canonical host in `config/site.ts` | same guard (`sitemapUrl`) |
| `/sitemap.xml` lists **every** indexable public page (137 URLs as of 2026-10-15; the number grows as content grows) | `app/sitemap.ts` → guard (`indexedNotInSitemap` must be `[]` or the audit exits 1) |
| The sitemap never lists a `noindex` page (`/admin`, `/offline.html`, the 32 hustle city permutation pages) | same guard (`noindexInSitemap`) |
| Every indexable page has a unique title, unique meta description and a canonical pointing at the committed host | `lib/seo.ts` `pageMetadata` → audit `missing.*`, `duplicateTitles`, `duplicateDescriptions`, `wrongCanonicalHost` are all `[]` |
| Sitemap `lastmod` dates are real revision dates: `/` and `/status` follow the latest genuine monitor reading in `data/live/`, articles follow their `updatedAt` — never the build clock | `app/sitemap.ts` `liveLastmod()` |

Pages that carry a `noindex` meta tag stay *crawlable* on purpose: Google can only honour a `noindex` it is allowed to read, so they are not in `robots.txt` either.

## 1. The one hostname question (read this before touching GSC)

Today the site is served at **`https://naijacheck.nnamdimichael020.workers.dev`**, while every canonical URL, sitemap entry and the robots sitemap line point at **`https://naijacheck.ng`** — the committed future home (`config/site.ts`, deliberately unchanged; see `docs/site-audit-2026-10-10.md`).

Consequences, stated plainly:

- GSC lets you register **the host you control today** (the `workers.dev` address) and hand it the sitemap file. Google will fetch `/sitemap.xml` from the `workers.dev` host successfully, and it **can** crawl the `workers.dev` pages — but the canonical tags tell it the "real" address of every page is on `naijacheck.ng`, an origin that does not serve the site until you buy the domain and point it here.
- Therefore: indexing requests on the `workers.dev` property are a drill and a monitoring hook, **not** a path to serious traffic. **Serious ranking requires the custom `.ng` domain** (section 5). That is the one unavoidable future step that is **not** ₦0 (a `.ng`/`com.ng` registration costs money at a registrar) and it is deliberately **not** part of this PR — no DNS or domain change is made here.
- None of this is broken. It is the deliberate pre-domain state, and this runbook holds your hand through both halves of it.

## 2. Add the Search Console property for the address you control today (~10 minutes)

1. Sign in to <https://search.google.com/search-console> with the site's Google account.
2. In the property selector (top-left) choose **Add property → URL prefix** (not "Domain": a Domain property needs DNS records, and you cannot add DNS records to a `workers.dev` address).
3. Enter exactly `https://naijacheck.nnamdimichael020.workers.dev` (your actual workers host) and continue.
4. When GSC offers verification methods, pick **HTML file**. It gives you a file named like `google1234abcd5678ef90.html`.
5. Verify ownership **in the repo, not in the Cloudflare dashboard** (dashboard-only steps get lost on redeploys; this file must live in Git):
   - Do not rename or edit the file. Copy it, byte for byte, to **`public/google1234abcd5678ef90.html`** (your exact filename) and open a normal pull request.
   - Merge, and redeploy the Worker (the site export copies `public/` verbatim, so the file lands at `https://naijacheck.nnamdimichael020.workers.dev/google1234abcd5678ef90.html`).
   - Confirm from your own machine: `curl -sS -o /dev/null -w '%{http_code}\n' https://naijacheck.nnamdimichael020.workers.dev/google1234abcd5678ef90.html` prints `200`.
6. Back in GSC, click **Verify**. Leave the file in the repo permanently — Google re-checks it from time to time; deleting it revokes the property.
7. (Alternative: the *HTML tag* method asks for a `<meta name="google-site-verification" ...>` token. If you prefer it, the token goes in `app/layout.tsx` under `metadata.verification = { google: "your-token" }` and is also committed. The file method above is simpler and recommended.)

## 3. Submit the sitemap (~2 minutes)

1. In the new property, open **Indexing → Sitemaps**.
2. Type `sitemap.xml` into "Add a new sitemap" and submit. (You can also paste the full `https://naijacheck.nnamdimichael020.workers.dev/sitemap.xml`; both mean the same file on this host.)
3. Refresh after a few minutes. Expect one of the following, and read it **without panic**:
   - **"Success"** — Google fetched the file. Remember it then reads 137 `<loc>` entries that all point at `https://naijacheck.ng/…` (by design — the committed canonical config). It will try those URLs and report "Discovered" / crawl states for them. This does not make `naijacheck.ng` appear in search before the domain exists.
   - **"Couldn't fetch"** — transient GSC lag; wait a day and resubmit once. If it persists, confirm the file serves: `curl -sSI https://naijacheck.nnamdimichael020.workers.dev/sitemap.xml | head -3` must show `200` and an XML content type.
4. Do **not** try to submit `https://naijacheck.ng/sitemap.xml` itself yet — GSC only accepts sitemaps for a property/hosts it covers, and you do not own that host in GSC until section 5. The `robots.txt` file served on `workers.dev` already points crawlers at the canonical sitemap address as well; robots-file Sitemap lines are informational and Google reconciles them once the domain exists.

## 4. Request indexing for the priority pages (a few minutes, honest expectations)

Use **URL Inspection** (the search box at the top of the property) for one URL at a time. Type the full address on the `workers.dev` host, press Enter, then choose **Request indexing**:

1. `https://naijacheck.nnamdimichael020.workers.dev/` (the home page)
2. `https://naijacheck.nnamdimichael020.workers.dev/status`
3. The top how-to guides, e.g.:
   - `…/howto/passport-renewal-2026`
   - `…/howto/nin-correction`
   - `…/howto/bvn-correction`
   - `…/howto/cac-business-name`
   - `…/howto/freelancer-tax-tin`

Read before you click:

- **Request indexing is a queue request, not a promise.** Google may take days to weeks, may say the URL is "Discovered – currently not indexed" or "Page with redirect/canonical", and the canonical-host situation in section 1 means Google can answer "Indexed, though blocked" or simply fold your `workers.dev` URL under the not-yet-live `naijacheck.ng` canonical. Any of those is a normal pre-domain answer.
- There is a per-property daily quota on manual requests (order ~10–12/day). Use it on the addresses above, then stop. Do not automate this button.
- The **URL Inspection** detail also tells you whether Google could fetch the page and what it decided the canonical is — that read-out is the real value of this step today.

## 5. When you buy the `.ng` domain (owner decision, outside this PR)

No DNS work is done in this PR. When the owner later buys `naijacheck.ng` (or similar) and points it at the Worker — a separate, documented operation — then:

1. Serving, canonical URLs, `robots.txt` and the sitemap need **no code change**: `config/site.ts` already says `https://naijacheck.ng`, so the moment the domain serves this site, every canonical and sitemap entry becomes true.
2. In GSC, add a **Domain** property for `naijacheck.ng` and verify by the DNS TXT record method at your registrar. This one property automatically covers `www`/non-www, http/https.
3. Submit `sitemap.xml` again in that property, and re-request indexing for `/`, `/status` and the same priority how-to URLs.
4. Keep the old `workers.dev` property: it stays useful to confirm Google folds the old host under the new canonical.

## 6. Verify the repo side yourself (before or after the GSC steps)

From a clean checkout:

```sh
npm run build          # regenerates out/ (sitemap.xml, robots.txt, every page)
npm run audit:static   # must exit 0: sitemap covers every indexable page, robots guards all true, 0 broken links
cat out/robots.txt     # Allow: /  +  Disallow: /admin  +  Disallow: /api/  +  Sitemap: https://naijacheck.ng/sitemap.xml
grep -c '<url>' out/sitemap.xml   # one <url> per indexable page (137 as of 2026-10-15)
```

Serve and smoke-test (any static server; here with Python):

```sh
python3 -m http.server 8080 --directory out &
curl -fsS -o /dev/null -w '/ -> %{http_code}\n' http://127.0.0.1:8080/index.html
curl -fsS -o /dev/null -w '/sitemap.xml -> %{http_code}\n' http://127.0.0.1:8080/sitemap.xml
curl -fsS -o /dev/null -w '/robots.txt -> %{http_code}\n' http://127.0.0.1:8080/robots.txt
kill %1
```

If `npm run audit:static` ever exits non-zero on `indexedNotInSitemap`, `noindexInSitemap` or `robots.ok: false`, the site step **regressed** — fix that before any GSC step, because Search Console cannot rescue a broken sitemap.

## 7. What never to do (keeps the ₦0 promise honest)

- Never add rate obfuscation, fake bot traps, "honeytoken" URLs, cloaking (different content for Googlebot) or WAF-as-code stunts to chase ranking. Google treats most of those as spam signals, and they are not needed.
- Never buy links, rent "SEO submission" services, or run automated "indexing" pings. If the sitemap is healthy (section 6), manual services add nothing Google doesn't already give you free.
- Never print impressions/clicks as a ranking claim. GSC numbers are measurements, not achievements — the reporting rule on this project stays honest.
