# Zero-cost operations check — 2026-10-09

This is a limit check, not a promise that vendors will keep these plans or approve an account. Recheck the linked official pages before changing architecture.

## Services actually used

### Cloudflare Workers and Static Assets

Cloudflare's current official pricing page lists Workers Free at **100,000 dynamic Worker requests/day** and **10 ms CPU per invocation**. The limits page also lists 128 MB memory, 50 subrequests/request, 20,000 static files/version and 25 MiB/file on Free. Static Assets documentation says static-asset requests and asset storage have no additional charge; `run_worker_first` routes still consume Worker requests.

NaijaCheck's audited export has 549 uploaded asset files. Static routes go directly to Assets. Only `/api/*` is configured `run_worker_first`, and the only implemented dynamic route is `/api/geo`. Thus the operational constraint is at most 100,000 dynamic API requests/day on the Free plan; exceeding it can fail rather than silently remain free. No traffic baseline exists, so headroom is not claimed.

Official pages:

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Static Assets billing and limitations](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

### GitHub Actions

The repository is public. GitHub's official Actions billing documentation says standard GitHub-hosted runners are free for public repositories; larger runners are charged. The monitor uses `ubuntu-latest`, a standard runner, every three hours: a theoretical maximum of 8 scheduled starts/day, about 240 in a 30-day month, plus manual runs. There were zero recorded workflow runs at audit time, so actual duration and reliability are unknown. Public-repository free usage is still subject to GitHub's service and usage policies; it is not described here as unlimited or permanent.

Official page:

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

## Evaluated but not provisioned

### KV and D1

Cloudflare currently lists Workers KV Free limits of 100,000 reads/day, 1,000 writes/day, 1,000 deletes/day, 1,000 lists/day and 1 GB stored. D1 Free lists 5 million rows read/day, 100,000 rows written/day and 5 GB total storage. Daily limits reset at 00:00 UTC; exceeding a limit can make operations fail. These products are **not bound or used** by this build, so their quotas are not counted as available application capacity and no “free forever” claim is made.

Official pages:

- [Cloudflare Workers/KV/D1 pricing table](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

### Web push

The browser Push API itself is not a complete delivery system. A secure deployment would still need user-initiated permission, VAPID key generation and secret storage, subscription storage, expiration/deletion handling, send jobs, abuse controls, privacy/controller contact details and operational monitoring. No authenticated subscriber store, valid controller contact, secret deployment or delivery runbook exists. Background push is therefore blocked rather than mislabelled; no polling feature is called push.

### Community submissions

KV/D1 quotas alone do not make public submissions safe. The public `/admin` client password was not security, and there is no server-side moderator identity, rate-limit design, spam handling, retention policy or controller contact. The editor is disabled and no submission endpoint was added. Owner action: establish authenticated moderation and valid privacy/controller details before selecting storage.

## Explicitly not enabled

No paid API, domain purchase, analytics vendor, newsletter service, push provider, payment provider, user-submission backend, KV namespace, D1 database or AdSense account was added. The hustle checkout remains a clearly labelled local mock and takes no payment details or money.
