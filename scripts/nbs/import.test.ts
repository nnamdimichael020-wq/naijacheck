import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { importNbsCsv, parseCsv } from "./import";

assert.deepEqual(parseCsv('State,Item,Value,Unit\nLagos,"Rice, local",1,kg\n'), [
  ["State", "Item", "Value", "Unit"],
  ["Lagos", "Rice, local", "1", "kg"],
]);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nbs-import-"));
const csv = path.join(dir, "food.csv");
fs.writeFileSync(csv, "State,Item,Average,Unit\nLagos,Rice,1500,1 kg\nRivers,Rice,1450,1 kg\n");
const result = importNbsCsv({
  category: "food",
  csvPath: csv,
  surveyMonth: "2026-09",
  publicationDate: "2026-10-08",
  geographyLevel: "state",
  sourceUrl: "https://microdata.nigerianstat.gov.ng/index.php/catalog/162",
  mapping: { geography: "State", item: "Item", value: "Average", unit: "Unit" },
});
assert.equal(result.observations.length, 2);
assert.equal(result.observations[0].geographyLevel, "state");
assert.match(result.warning, /Never represent/);

assert.throws(() => importNbsCsv({
  category: "food", csvPath: csv, surveyMonth: "2026-09", publicationDate: "2026-10-08",
  geographyLevel: "city" as "state", sourceUrl: "https://microdata.nigerianstat.gov.ng/index.php/catalog/162",
  mapping: { geography: "State", item: "Item", value: "Average", unit: "Unit" },
}), /city labelling is forbidden/);
assert.throws(() => importNbsCsv({
  category: "food", csvPath: csv, surveyMonth: "2026-09", publicationDate: "2026-10-08",
  geographyLevel: "state", sourceUrl: "https://example.com/not-nbs",
  mapping: { geography: "State", item: "Item", value: "Average", unit: "Unit" },
}), /official FOOD catalogue/);

fs.rmSync(dir, { recursive: true, force: true });
console.log("ok - NBS CSV import validates source, dates, geography, units and rows");
