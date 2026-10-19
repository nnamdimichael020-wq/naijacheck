import assert from "node:assert/strict";
import { changedThisWeek } from "./changed-this-week";
import { microReadingState } from "./micro-reading";
import type { HistoryPoint, HistoryStore } from "./history";
import type { Article } from "./types";

const now = Date.parse("2026-10-19T12:00:00Z");
const point = (value: number, sourceTime: string, observedAt = sourceTime): HistoryPoint => ({
  dataset: "fuel-depot-petrol", sourceTime, observedAt, value, unit: "NGN per litre",
  geography: "Nigeria depot", sourceUrl: "https://example.com/source",
});
const store = (...points: HistoryPoint[]): HistoryStore => ({ collectionStartedAt: points[0]?.observedAt ?? null, points });
const old = "2026-10-10T09:00:00Z";
const recent = "2026-10-18T09:00:00Z";
const late = "2026-10-19T09:00:00Z";
assert.deepEqual(changedThisWeek(store(), [], now), []);
assert.deepEqual(changedThisWeek(store(point(100, recent)), [], now), []); // no baseline
assert.deepEqual(changedThisWeek(store(point(100, old), point(100, recent)), [], now), []); // unchanged poll
assert.deepEqual(changedThisWeek(store(point(100, old), point(120, old, recent)), [], now), []); // old source re-scraped
assert.deepEqual(changedThisWeek(store(point(100, old), point(120, recent, old)), [], now), []); // old observation
assert.deepEqual(changedThisWeek(store(point(100, old), point(120, "2026-10-20T09:00:00Z")), [], now), []); // future source
const changes = changedThisWeek(store(point(100, old), point(120, recent), point(120, late)), [], now);
assert.equal(changes.length, 1);
assert.equal(changes[0].href, "/prices/fuel");
assert.match(changes[0].detail, /₦100\/L to ₦120\/L/);
assert.equal(changes[0].at, recent); // flat latest observation cannot claim a new move
const reversed = changedThisWeek(store(point(100, old), point(120, recent), point(100, late)), [], now);
assert.equal(reversed.length, 1);
assert.match(reversed[0].detail, /₦120\/L to ₦100\/L/);

const article = (updatedAt: string): Pick<Article, "path" | "title" | "updatedAt" | "lastVerified" | "verification"> => ({
  path: "/howto/sample", title: "A reviewed guide", updatedAt, lastVerified: updatedAt, verification: "manual",
});
assert.equal(changedThisWeek(store(), [article("2026-10-18")], now)[0].href, "/howto/sample");
assert.deepEqual(changedThisWeek(store(), [article("2026-10-12"), article("2026-10-20")], now), []); // day-only boundary and future
assert.deepEqual(changedThisWeek(store(), [article("2026-10-09")], now), []);
assert.match(changedThisWeek(store(), [{ ...article("2026-10-18"), lastVerified: undefined }], now)[0].detail, /verification not established/);

const reading = { state: "recent" as const, checkedAt: recent, sourceTime: recent, staleAfterHours: 24 };
assert.equal(microReadingState(reading, now), "Stale");
assert.equal(microReadingState({ ...reading, state: "stale" }, Date.parse(recent)), "Stale");
assert.equal(microReadingState({ ...reading, state: "seeded" }, now), "Seeded, unverified");
assert.equal(microReadingState({ ...reading, state: "live", sourceTime: late }, now), "Recent at last check");
assert.equal(microReadingState({ ...reading, checkedAt: null }, now), "Unavailable");
console.log("Weekly changes and saved micro-bar state: passed");
