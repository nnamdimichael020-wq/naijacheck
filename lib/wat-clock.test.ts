/**
 * Unit test: WAT clock must use fixed Africa/Lagos (WAT, UTC+1), 12-hour time with am/pm,
 * and never visitor local TZ.
 */
import assert from "node:assert/strict";
import { formatWatClock, formatWatClockShort, WAT_TIME_ZONE } from "./wat-clock";

function check() {
  assert.equal(WAT_TIME_ZONE, "Africa/Lagos", "timezone constant must be Africa/Lagos");

  // 1) UTC midnight -> Lagos 1:00:00 am on Thu 01 Jan 2026
  const utcMidnight = new Date("2026-01-01T00:00:00.000Z");
  const out = formatWatClock(utcMidnight);
  assert.match(out, /Thursday/i, "should contain weekday Thursday");
  assert.match(out, /01\s+Jan\s+2026/i, "should contain date 01 Jan 2026");
  assert.match(out, /\b1:00:00 am WAT$/, "Lagos 1:00:00 am WAT should appear (UTC midnight +1h)");

  const shortMorning = formatWatClockShort(utcMidnight);
  assert.match(shortMorning, /01\s+Jan\s+2026 · 1:00 am WAT$/, "short WAT format includes 12h am/pm");

  // 2) Example shape check: 2026-10-23T01:17:05Z -> Friday, 23 Oct 2026 · 2:17:05 am WAT
  const octSample = new Date("2026-10-23T01:17:05.000Z");
  assert.equal(formatWatClock(octSample), "Friday, 23 Oct 2026 · 2:17:05 am WAT");
  assert.equal(formatWatClockShort(octSample), "23 Oct 2026 · 2:17 am WAT");

  // 3) Same instant formatted in UTC would be 12:00:00 am — prove we never use visitor/UTC TZ
  const utcFormatted =
    new Intl.DateTimeFormat("en-NG", {
      timeZone: "UTC",
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(utcMidnight)
      .replace(/\s+/g, " ")
      .trim() +
    " · " +
    new Intl.DateTimeFormat("en-NG", {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
      .format(utcMidnight)
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase() +
    " WAT";
  assert.notEqual(out, utcFormatted, "WAT output must differ from UTC output for same instant");

  // 4) Mid-year afternoon fixture: UTC 12:00:00 -> Lagos 1:00:00 pm (no DST drift; 12h pm, never 13:00:00)
  const summer = new Date("2026-06-15T12:00:00.000Z");
  const summerOut = formatWatClock(summer);
  assert.match(summerOut, /\b1:00:00 pm WAT$/, "Lagos 1:00:00 pm WAT for UTC noon");
  assert.doesNotMatch(summerOut, /\b13:00:00\b/, "must use 12-hour clock, not 24-hour 13:00:00");
  assert.match(formatWatClockShort(summer), /\b1:00 pm WAT$/, "short WAT format uses 1:00 pm WAT");

  // 5) Noon & midnight boundary checks in WAT
  // 2026-06-15T11:00:00Z => 12:00:00 pm WAT; 2026-06-14T23:00:00Z => 12:00:00 am WAT on 15 Jun
  assert.match(formatWatClock(new Date("2026-06-15T11:00:00.000Z")), /\b12:00:00 pm WAT$/);
  assert.match(formatWatClock(new Date("2026-06-14T23:00:00.000Z")), /15 Jun 2026 · 12:00:00 am WAT$/);

  // 6) Invalid Date handling
  assert.equal(formatWatClock(new Date("invalid")), "—");
  assert.equal(formatWatClockShort(new Date("invalid")), "—");

  console.log("ok - wat-clock uses Africa/Lagos (WAT) in 12-hour am/pm format");
}

check();
