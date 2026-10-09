/**
 * Blueprint matcher. Pure functions with no imports from /data, so the client bundle stays small:
 * the page passes the blueprint data in as props.
 */

export type HustleBlueprint = {
  slug: string;
  name: string;
  category: string;
  capitalMin: number;
  capitalMax: number;
  sampleCapital: number;
  skills: string[];
  cacRequired: boolean;
  nafdacRequired: boolean;
  licences: string[];
  startupBreakdown: { item: string; share: number }[];
  monthlyCosts: { item: string; amount: number }[];
  grossMarginPct: number;
  profitTimeline: { month: string; label: string }[];
  steps: string[];
  failurePoints: string[];
  suppliers: { name: string; where: string; note: string }[];
  spark: string;
  premiumNotes: string;
};

export type HustleInput = { capital: number; city: string; skills: string[] };

export type HustleMatch = {
  blueprint: HustleBlueprint;
  score: number;
  fits: boolean;
  reasons: string[];
  cityNote: string;
  startupSplit: { item: string; amount: number; share: number }[];
};

export const CAPITAL_MIN = 150000;
export const CAPITAL_MAX = 2000000;
export const CAPITAL_STEP = 10000;

export function capLabel(n: number) {
  return n >= 1000000 ? `₦${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}m` : `₦${Math.round(n / 1000)}k`;
}

/** Score each blueprint for a capital amount, city and skills. Higher is better. */
export function matchBlueprints(
  input: HustleInput,
  blueprints: HustleBlueprint[],
  cityFactors: Record<string, { label: string; note: string }>,
): HustleMatch[] {
  const city = cityFactors[input.city];
  return blueprints
    .map((b) => {
      const reasons: string[] = [];
      let score = 0;

      const fits = input.capital >= b.capitalMin && input.capital <= b.capitalMax;
      if (fits) {
        score += 50;
        reasons.push(`${capLabel(input.capital)} sits inside this model's ${capLabel(b.capitalMin)} to ${capLabel(b.capitalMax)} range.`);
      } else {
        // Partial credit that falls off the further the capital sits outside the range.
        const width = b.capitalMax - b.capitalMin;
        const gap = input.capital < b.capitalMin ? b.capitalMin - input.capital : input.capital - b.capitalMax;
        score += Math.max(0, 30 - (gap / width) * 60);
      }

      const shared = b.skills.filter((s) => input.skills.includes(s));
      if (shared.length > 0) {
        score += shared.length * 15;
        reasons.push(`Uses your ${shared.length === 1 ? "skill" : "skills"}: ${shared.join(", ")}.`);
      }

      if (input.capital < 400000 && b.capitalMin <= 200000) {
        score += 10;
        reasons.push("A lean start that suits a budget under ₦400k.");
      }

      return {
        blueprint: b,
        score: Math.round(score),
        fits,
        reasons,
        cityNote: city ? `${city.label}: ${city.note}` : "",
        startupSplit: b.startupBreakdown.map((s) => ({ item: s.item, amount: Math.round(input.capital * s.share), share: s.share })),
      };
    })
    .sort((a, b) => b.score - a.score);
}
