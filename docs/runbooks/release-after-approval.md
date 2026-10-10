# Release after explicit approval

Do not merge or alter production until the owner explicitly approves. Work from the reviewed PR branch; never push directly to `main`. Domain purchase/DNS, canonical URL, Worker attachment and production routes are separate decisions and remain unchanged.

## Preflight

1. Confirm current branch and clean status; fetch and inspect actual `origin/main`, live deployment and PR diff.
2. Confirm the PR is mergeable and required checks are attached to its latest head.
3. Read source health row by row. CBN, Aboki, open.er-api, Awajis, news, Wikimedia and Immigration watcher evidence must be reported separately. A CBN/fuel/Immigration failure makes the run partial.
4. Review `config/site.ts`, `wrangler.jsonc`, `worker/index.ts`, canonical/robots settings and routes for unapproved changes.
5. For Web Push, complete `web-push-owner-setup.md` steps 1–4 only after approval and before production testing. Never put secrets in Git or chat.

## Required branch commands

```bash
npm ci
npm run typecheck
npm run lint
npm run monitor:test
npm run push:test
npm run nbs:test
npm run build
npx wrangler deploy --dry-run
npm run audit:static
npm audit --omit=dev
npm audit
```

Do not use `npm audit fix --force`. Record exact advisory paths, direct/transitive status, compatible upgrade evidence and any accepted build-time-only exposure.

## Worker smoke and crawl

Run local Wrangler with local KV binding/config only. Verify:

- `/` and `/status` return 200;
- `/api/geo` returns no-store JSON;
- `GET /api/push/config` returns no-store JSON and honestly reports unavailable without bindings;
- same-origin `POST /api/push/subscribe` returns 503 when unconfigured and validates/stores only endpoint plus keys when configured locally;
- unauthenticated `POST /api/push/test` returns 401;
- unknown API and page routes return 404;
- all generated/sitemap routes crawl with zero broken internal links.

Keep local build/crawl, GitHub runner monitor, branch preview, live production and real-browser evidence clearly separate.

## Preview and device QA

Deploy to the branch preview first. Crawl homepage, `/status`, key hubs, robots, sitemap, `/api/geo`, push config and all reachable routes. Complete `browser-qa-checklist.md`; if graphical browsers or phones are unavailable, mark those items unverified rather than passed.

Before production push enablement, verify KV binding, encrypted secrets and cron in Cloudflare. After the approved release, test on a physical backgrounded phone. A successful build, config response or push-service acceptance is not proof the device displayed a notification.

## Merge/deploy/rollback

1. Update the PR with three explicit groups: complete/tested; implemented but awaiting dashboard/device work; blocked with exact reason.
2. Capture previous production deployment ID and last-good data commit.
3. Merge only after explicit owner approval, using the reviewed PR and repository policy.
4. Watch the deployment and scheduled monitor. Confirm production routing/canonical/domain remain as approved.
5. Perform production HTTP smoke, crawl and owner phone push test. Keep the page-open watchlist available.
6. On regression, roll back the Worker deployment/code. Do not overwrite newer genuine observations or fabricate history. If push quotas/secrets/bindings fail, disable push/cron without buying capacity and follow the owner runbook.
