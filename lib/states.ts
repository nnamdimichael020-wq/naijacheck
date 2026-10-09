import statesFile from "@/data/states.json";

export type StateEntry = { name: string; city: string; note?: string; aliases?: string[] };

export const STATES = statesFile.states as StateEntry[];

const norm = (s: string) => s.toLowerCase().replace(/\bstate\b/g, "").replace(/[^a-z]/g, "");

/** Map a detected region name (from the visitor's network location) to a state entry. */
export function matchState(region: string | null | undefined): StateEntry | null {
  if (!region) return null;
  const r = norm(region);
  if (!r) return null;
  return (
    STATES.find((s) => norm(s.name) === r) ??
    STATES.find((s) => (s.aliases ?? []).some((a) => norm(a) === r)) ??
    null
  );
}
