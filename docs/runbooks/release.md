# Release runbook

## Preflight

- Confirm branch and `git status`; fetch `origin/main` and inspect the actual PR diff. Never release from or push directly to `main` in an Agent session.
- Confirm `config/site.ts`, `wrangler.jsonc`, `worker/index.ts`, canonical/robots settings, domain/DNS, and production Worker routing have no unapproved change.
- Read source health. A run with CBN, fuel, or Immigration failure is partial, not full success.

## Required commands

```bash
npm ci
npm run typecheck
npm run lint
npm run monitor:test
npm run nbs:test
npm run build
npx wrangler deploy --dry-run
npm run audit:static
npm audit --omit=dev
npm audit
```

Run the Worker smoke tests used by the repository and crawl the static export. Enumerate sitemap/generated routes and record HTTP status, canonical host, title, description, H1, JSON-LD, source/freshness data, and broken internal links. Keep local crawl evidence separate from live and branch-preview evidence.

## Preview and QA

Deploy only to the branch preview. Crawl homepage, `/status`, `/prices`, `/trends`, `/hustle`, `/tools`, `/robots.txt`, `/sitemap.xml`, and `/api/geo`, then all reachable routes. Complete `browser-qa.md` on real devices/browsers; if unavailable, state that explicitly rather than claiming completion.

Check PWA cache exclusions, offline stale display, share privacy/fallback, local watchlist, 2G/3G payload behavior, disabled monetization/community/payment, and source labels/times.

## Dependency evidence

Record exact audit totals, advisory paths, direct/transitive status, chosen versions, and compatibility results. Never use `npm audit fix --force`. If a maintained dependency has no patched compatible version, document its build/runtime exposure and the migration/removal plan.

## Approval and rollback

Update the PR with completed/tested work, owner/device/legal work, and blocked workarounds as separate lists. Do not merge without explicit owner approval. Preserve the previous deployment identifier and last-good data. Roll back code/deployment on regression; do not roll back genuine history or overwrite a newer successful observation with fabricated data.