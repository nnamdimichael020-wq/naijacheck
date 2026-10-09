import historyFile from "@/data/history.json";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Point = { dataset: string; observedAt: string; sourceTime: string; value: number; unit: string; geography: string; sourceUrl: string };
const HISTORY = historyFile as { collectionStartedAt: string | null; points: Point[] };

export function HistoryChart({ dataset = "cbn-usd-ngn", days = 30 }: { dataset?: string; days?: 7 | 30 | 90 }) {
  const cutoff = Date.now() - days * 86_400_000;
  const points = HISTORY.points.filter((p) => p.dataset === dataset && Date.parse(p.observedAt) >= cutoff).slice(-90);
  if (points.length < 2) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Observed history</CardTitle><CardDescription>Actual successful observations only; no backfilled values.</CardDescription></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          History is unavailable until this repository records at least two successful, changed source readings. Collection has not started; no chart is fabricated.
        </CardContent>
      </Card>
    );
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * 100},${36 - ((p.value - min) / range) * 32}`).join(" ");
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">CBN USD/NGN observations · {days} days</CardTitle><CardDescription>Collection began {HISTORY.collectionStartedAt?.slice(0, 10)}. Gaps mean no changed successful reading was recorded.</CardDescription></CardHeader>
      <CardContent>
        <svg role="img" aria-label={`Line chart from ${min.toLocaleString("en-NG")} to ${max.toLocaleString("en-NG")} NGN per USD across ${points.length} changed observations`} viewBox="0 0 100 40" className="h-44 w-full" preserveAspectRatio="none">
          <polyline points={coords} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" className="text-primary" />
        </svg>
        <p className="text-xs text-muted-foreground">Latest: ₦{points.at(-1)!.value.toLocaleString("en-NG")} per USD · source time {points.at(-1)!.sourceTime}</p>
      </CardContent>
    </Card>
  );
}
