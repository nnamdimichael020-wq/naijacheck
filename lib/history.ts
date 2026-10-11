/**
 * Bounded observation history and delta helpers for monitored datasets.
 * Only real, validated monitor parses are appended; values are never invented or backfilled.
 */

export const MAX_HISTORY_POINTS_PER_DATASET = 56;

export type HistoryDatasetId =
  | "parallel-usd-ngn-buy"
  | "fuel-depot-petrol"
  | "cbn-usd-ngn"
  | "fuel-depot-diesel"
  | "fuel-depot-lpg"
  | (string & {});

export type HistoryPoint = {
  dataset: HistoryDatasetId;
  observedAt: string;
  sourceTime: string;
  value: number;
  unit: string;
  geography: string;
  sourceUrl: string;
};

export type HistoryStore = {
  collectionStartedAt: string | null;
  points: HistoryPoint[];
};

export type HistoryDelta = {
  dataset: string;
  latest: HistoryPoint;
  previous: HistoryPoint;
  delta: number;
  pctChange: number | null;
  direction: "up" | "down" | "flat";
};

export function isValidHistoryPoint(point: unknown): point is HistoryPoint {
  if (!point || typeof point !== "object") return false;
  const candidate = point as Partial<HistoryPoint>;
  if (typeof candidate.dataset !== "string" || candidate.dataset.trim().length === 0) return false;
  if (typeof candidate.value !== "number" || !Number.isFinite(candidate.value) || candidate.value <= 0) return false;
  if (typeof candidate.sourceTime !== "string" || !Number.isFinite(Date.parse(candidate.sourceTime))) return false;
  if (typeof candidate.observedAt !== "string" || !Number.isFinite(Date.parse(candidate.observedAt))) return false;
  if (typeof candidate.unit !== "string" || candidate.unit.trim().length === 0) return false;
  if (typeof candidate.geography !== "string" || candidate.geography.trim().length === 0) return false;
  if (typeof candidate.sourceUrl !== "string" || candidate.sourceUrl.trim().length === 0) return false;
  return true;
}

/**
 * Appends a real observation if it is valid and represents a new source reading or changed value,
 * while bounding each dataset independently to the most recent `maxPerDataset` points (default 56).
 */
export function appendBoundedHistory(
  store: HistoryStore,
  candidate: HistoryPoint,
  maxPerDataset: number = MAX_HISTORY_POINTS_PER_DATASET,
): HistoryStore {
  const existingPoints = Array.isArray(store?.points) ? store.points.filter(isValidHistoryPoint) : [];
  if (!isValidHistoryPoint(candidate) || maxPerDataset < 1) {
    return {
      collectionStartedAt: store?.collectionStartedAt ?? existingPoints[0]?.observedAt ?? null,
      points: existingPoints,
    };
  }

  const lastForDataset = [...existingPoints].reverse().find((p) => p.dataset === candidate.dataset);
  const candidateSourceMs = Date.parse(candidate.sourceTime);
  const lastSourceMs = lastForDataset ? Date.parse(lastForDataset.sourceTime) : -Infinity;

  // Ignore duplicate reading with identical sourceTime and value, or out-of-order older sourceTime.
  const shouldAppend =
    !lastForDataset ||
    candidateSourceMs > lastSourceMs ||
    (candidateSourceMs === lastSourceMs && candidate.value !== lastForDataset.value);

  const combined = shouldAppend ? [...existingPoints, candidate] : [...existingPoints];

  // Bound each dataset independently to its last `maxPerDataset` points while preserving order.
  const countsByDataset = new Map<string, number>();
  const keptReversed: HistoryPoint[] = [];
  for (let i = combined.length - 1; i >= 0; i -= 1) {
    const item = combined[i];
    const used = countsByDataset.get(item.dataset) ?? 0;
    if (used < maxPerDataset) {
      countsByDataset.set(item.dataset, used + 1);
      keptReversed.push(item);
    }
  }
  const boundedPoints = keptReversed.reverse();

  return {
    collectionStartedAt: boundedPoints[0]?.observedAt ?? store?.collectionStartedAt ?? null,
    points: boundedPoints,
  };
}

/**
 * Returns the bounded history points for a dataset in chronological order.
 */
export function getDatasetHistory(
  store: HistoryStore,
  dataset: string,
  limit: number = MAX_HISTORY_POINTS_PER_DATASET,
): HistoryPoint[] {
  if (!store?.points?.length || limit < 1) return [];
  return store.points
    .filter((p) => isValidHistoryPoint(p) && p.dataset === dataset)
    .slice(-limit);
}

/**
 * Computes the change between the latest two real observations for a dataset.
 * Returns null when fewer than two real observations exist.
 */
export function computeDatasetDelta(store: HistoryStore, dataset: string): HistoryDelta | null {
  const points = getDatasetHistory(store, dataset, MAX_HISTORY_POINTS_PER_DATASET);
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = Math.round((latest.value - previous.value) * 10000) / 10000;
  const pctChange =
    previous.value > 0
      ? Math.round(((latest.value - previous.value) / previous.value) * 10000) / 100
      : null;
  const direction: HistoryDelta["direction"] = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    dataset,
    latest,
    previous,
    delta,
    pctChange,
    direction,
  };
}
