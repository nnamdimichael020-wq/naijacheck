/**
 * Unit test: WAT clock must use fixed Africa/Lagos (WAT, UTC+1) and never visitor local TZ.
 */
import assert from "node:assert/strict";
import { formatWatClock, WAT_TIME_ZONE } from "./wat-clock";

function check() {
  assert.equal(WAT_TIME_ZONE, "Africa/Lagos", "timezone constant must be Africa/Lagos");

  // Pick a winter date where UTC and Lagos differ predictably.
  // 2026-01-01T00:30:00Z => Lagos is 01:30:00 on Thu 01 Jan 2026
  const utcMidnight = new Date("2026-01-01T00:00:00.000Z");
  const out = formatWatClock(utcMidnight);
  // Expect weekday, day, month, year, time HH:MM:SS, and WAT label
  assert.match(out, /Thursday/i, "should contain weekday Thursday");
  assert.match(out, /01\s+Jan\s+2026/i, "should contain date 01 Jan 2026");
  assert.match(out, /01:00:00/, "Lagos 01:00:00 should appear (UTC midnight +1h)");
  assert.match(out, /WAT$/, "must end with WAT label");

  // Same instant formatted in UTC would be 00:00:00 — prove we didn't use visitor TZ
  const utcFormatted = new Intl.DateTimeFormat("en-NG", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(utcMidnight) + " · " + new Intl.DateTimeFormat("en-NG", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(utcMidnight) + " WAT";
  assert.notEqual(out, utcFormatted, "WAT output must differ from UTC output for same instant");

  // Second fixture: mid-year, ensure no DST drift (Nigeria never observes DST)
  const summer = new Date("2026-06-15T12:00:00.000Z");
  const summerOut = formatWatClock(summer);
  assert.match(summerOut, /13:00:00/, "Lagos 13:00 for UTC noon");

  // Invalid handling
  assert.equal(formatWatClock(new Date("invalid")), "—");

  console.log("ok - wat-clock uses Africa/Lagos (WAT) and detailed format");
}

check();
