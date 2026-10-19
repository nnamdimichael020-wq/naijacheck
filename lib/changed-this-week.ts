import { isValidHistoryPoint, type HistoryStore } from "@/lib/history";
import type { Article } from "@/lib/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONITORED = [
  { id: "parallel-usd-ngn-buy", label: "Parallel USD buy quote", href: "/status", unit: "/US$" },
  { id: "cbn-usd-ngn", label: "CBN USD closing rate", href: "/status", unit: "/US$" },
  { id: "fuel-depot-petrol", label: "Petrol depot median", href: "/prices/fuel", unit: "/L" },
  { id: "fuel-depot-diesel", label: "Diesel depot median", href: "/prices/fuel", unit: "/L" },
  { id: "fuel-depot-lpg", label: "LPG depot median", href: "/prices/fuel", unit: "/kg" },
] as const;

export type WeeklyChange = {
  key: string;
  label: string;
  detail: string;
  href: string;
  at: string;
  kind: "reading" | "article";
};

/**
 * Only recorded value changes (not repeated unchanged polls) and dated article edits.
 * Both the monitor observation AND its source reading must be within seven days; a fresh
 * scrape of an old quote does not make an old move new. Never fabricate a baseline.
 */
export function changedThisWeek(history: HistoryStore, articles: Pick<Article, "path" | "title" | "updatedAt" | "lastVerified" | "verification">[], nowMs: number): WeeklyChange[] {
  if (!Number.isFinite(nowMs)) return [];
  const cutoff = nowMs - WEEK_MS;
  const points = Array.isArray(history?.points) ? history.points.filter(isValidHistoryPoint) : [];
  const moves: WeeklyChange[] = [];
  for (const dataset of MONITORED) {
    const series = points.filter((p) => p.dataset === dataset.id).sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt));
    for (let i = series.length - 1; i > 0; i--) {
      const point = series[i];
      const sourceMs = Date.parse(point.sourceTime);
      const observedMs = Date.parse(point.observedAt);
      if (sourceMs < cutoff || sourceMs > nowMs || observedMs < cutoff || observedMs > nowMs || point.value === series[i - 1].value) continue;
      const previous = series[i - 1];
      moves.push({
        key: dataset.id, kind: "reading", label: dataset.label, href: dataset.href,
        at: point.sourceTime,
        detail: `Source moved from ₦${previous.value.toLocaleString("en-NG")}${dataset.unit} to ₦${point.value.toLocaleString("en-NG")}${dataset.unit}. Recorded ${point.observedAt.slice(0, 10)}; later readings may differ.`,
      });
      break;
    }
  }

  // updatedAt is date-only; count only complete UTC calendar days safely within the
  // rolling 7-day window. Do not infer an exact publication hour from a date-only field.
  const firstFullDay = new Date(cutoff).toISOString().slice(0, 10);
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const edits: WeeklyChange[] = (Array.isArray(articles) ? articles : [])
    .filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a.updatedAt) && a.updatedAt > firstFullDay && a.updatedAt <= today && Number.isFinite(Date.parse(a.updatedAt)))
    .map((a) => ({
      key: a.path, kind: "article" as const, label: a.title, href: a.path, at: a.updatedAt,
      detail: a.lastVerified && a.lastVerified >= a.updatedAt && a.verification === "manual"
        ? `Article updated ${a.updatedAt} · manually verified ${a.lastVerified}.`
        : `Article updated ${a.updatedAt} · verification not established by this update.`,
    }));
  // A small balanced set: hourly monitor observations must not bury editorial updates.
  return [...moves.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3), ...edits.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3)]
    .sort((a, b) => b.at.localeCompare(a.at));
}
