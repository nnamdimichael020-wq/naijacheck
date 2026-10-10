import fs from "node:fs";
import path from "node:path";

export type NbsCategory = "food" | "pms" | "ago" | "lpg";
export type ColumnMapping = { geography: string; value: string; item?: string; unit?: string };
export type ImportOptions = {
  category: NbsCategory;
  csvPath: string;
  surveyMonth: string;
  publicationDate: string;
  geographyLevel: "state" | "national";
  sourceUrl: string;
  mapping: ColumnMapping;
  fixedUnit?: string;
};

const CATALOGUE: Record<NbsCategory, string> = {
  food: "https://microdata.nigerianstat.gov.ng/index.php/catalog/162",
  pms: "https://microdata.nigerianstat.gov.ng/index.php/catalog/157",
  ago: "https://microdata.nigerianstat.gov.ng/index.php/catalog/158",
  lpg: "https://microdata.nigerianstat.gov.ng/index.php/catalog/160",
};

export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (quoted) throw new Error("CSV has an unterminated quoted field");
  return rows;
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const month = /^\d{4}-(0[1-9]|1[0-2])$/;

export function importNbsCsv(options: ImportOptions) {
  if (!(["state", "national"] as string[]).includes(options.geographyLevel)) throw new Error("geographyLevel must be state or national; city labelling is forbidden");
  if (!month.test(options.surveyMonth)) throw new Error("surveyMonth must be YYYY-MM");
  if (!isoDate.test(options.publicationDate) || Number.isNaN(Date.parse(`${options.publicationDate}T00:00:00Z`))) throw new Error("publicationDate must be a valid YYYY-MM-DD");
  if (options.sourceUrl.replace(/\/$/, "") !== CATALOGUE[options.category]) throw new Error(`sourceUrl must be the official ${options.category.toUpperCase()} catalogue ${CATALOGUE[options.category]}`);
  if (!fs.existsSync(options.csvPath)) throw new Error(`CSV not found: ${options.csvPath}`);

  const parsed = parseCsv(fs.readFileSync(options.csvPath, "utf8").replace(/^\uFEFF/, ""));
  if (parsed.length < 2) throw new Error("CSV must contain a header and at least one data row");
  const headers = parsed[0];
  const index = (name: string | undefined, required: boolean) => {
    if (!name) {
      if (required) throw new Error("A required column mapping is missing");
      return -1;
    }
    const i = headers.indexOf(name);
    if (i < 0) throw new Error(`Mapped column not found: ${name}`);
    return i;
  };
  const geographyIndex = index(options.mapping.geography, true);
  const valueIndex = index(options.mapping.value, true);
  const itemIndex = index(options.mapping.item, options.category === "food");
  const unitIndex = index(options.mapping.unit, !options.fixedUnit);

  const observations = parsed.slice(1).map((row, offset) => {
    const geography = row[geographyIndex]?.trim();
    const value = Number(row[valueIndex]?.replace(/[₦,\s]/g, ""));
    const item = itemIndex >= 0 ? row[itemIndex]?.trim() : options.category.toUpperCase();
    const unit = options.fixedUnit ?? row[unitIndex]?.trim();
    if (!geography) throw new Error(`Row ${offset + 2}: geography is empty`);
    if (!item) throw new Error(`Row ${offset + 2}: item/product is empty`);
    if (!unit) throw new Error(`Row ${offset + 2}: unit is empty; never infer a unit`);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Row ${offset + 2}: value must be a positive number`);
    return { geography, geographyLevel: options.geographyLevel, item, value, unit };
  });

  const seen = new Set<string>();
  for (const row of observations) {
    const key = `${row.geography}\u0000${row.item}\u0000${row.unit}`.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate observation: ${row.geography} / ${row.item} / ${row.unit}`);
    seen.add(key);
  }

  return {
    schemaVersion: 1,
    category: options.category,
    status: "official-monthly-survey" as const,
    surveyMonth: options.surveyMonth,
    publicationDate: options.publicationDate,
    importedAt: new Date().toISOString(),
    source: { name: "National Bureau of Statistics", url: options.sourceUrl },
    geographyLevel: options.geographyLevel,
    warning: "Monthly survey reference. Never represent a state or national average as a live city price.",
    observations,
  };
}

function argument(name: string): string | undefined {
  const position = process.argv.indexOf(`--${name}`);
  return position >= 0 ? process.argv[position + 1] : undefined;
}

if (require.main === module) {
  const category = process.argv[2] as NbsCategory;
  const csvPath = process.argv[3];
  const mappingPath = argument("mapping");
  if (!CATALOGUE[category] || !csvPath || !mappingPath) {
    console.error("Usage: npm run nbs:import -- <food|pms|ago|lpg> input.csv --survey-month YYYY-MM --publication-date YYYY-MM-DD --geography-level state|national --source-url URL --mapping mapping.json [--unit UNIT]");
    process.exit(2);
  }
  const result = importNbsCsv({
    category,
    csvPath,
    surveyMonth: argument("survey-month") ?? "",
    publicationDate: argument("publication-date") ?? "",
    geographyLevel: argument("geography-level") as "state" | "national",
    sourceUrl: argument("source-url") ?? "",
    mapping: JSON.parse(fs.readFileSync(mappingPath, "utf8")) as ColumnMapping,
    fixedUnit: argument("unit"),
  });
  if (!(["state", "national"] as string[]).includes(result.geographyLevel)) throw new Error("geography-level must be state or national; city labelling is forbidden");
  const root = path.resolve(__dirname, "../..");
  const output = path.join(root, "data", "official", "nbs", `${category}-${result.surveyMonth}.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  console.log(`[nbs-import] validated ${result.observations.length} observations -> ${output}`);
}
