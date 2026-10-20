/**
 * Scrollable table of every stored reading for one series. Server-rendered: no client JavaScript.
 *
 * Rows are drawn only from `data/history.json`. The newest row carries the dataset's current
 * verification label; older rows are labelled as stored historical readings so a stale or seeded
 * dataset can never be presented as live. Nothing is rounded into a different number.
 */
import { Badge } from "@/components/ui/badge";
import { formatChartValue, type ChartSeriesSpec } from "@/lib/chart-series";
import { historyPointTimeMs, type HistoryPoint } from "@/lib/history";
import { formatWatFull } from "@/lib/utils";

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function ChartPointsTable({
  id,
  spec,
  points,
  maxPoints,
  sourceName,
  sourceUrl,
  currentStateLabel,
  className,
}: {
  id: string;
  spec: ChartSeriesSpec;
  /** Chronological stored readings (oldest first), exactly as they appear in data/history.json. */
  points: HistoryPoint[];
  maxPoints: number;
  sourceName: string;
  sourceUrl?: string;
  /** e.g. "Recent source reading" from lib/source-registry. */
  currentStateLabel: string;
  className?: string;
}) {
  const formatValue = (value: number) => formatChartValue(value, spec.fractionDigits, spec.unitSuffix);

  if (points.length === 0) {
    return (
      <div id={id} className={className}>
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          No stored readings yet for this series (0 / {maxPoints}). The monitor appends a row only after a successful
          source read, so this table stays empty rather than listing invented values.
        </p>
      </div>
    );
  }

  const newestFirst = points
    .map((point, index) => ({ point, previous: index > 0 ? points[index - 1] : null }))
    .reverse();

  return (
    <div id={id} className={className}>
      <div
        role="region"
        aria-label={`${spec.label}: ${points.length} stored readings`}
        tabIndex={0}
        className="max-h-[28rem] overflow-auto rounded-xl border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
          <caption className="sr-only">
            {spec.label}: {points.length} of {maxPoints} stored readings, newest first. Source: {sourceName}. The
            verification badge on the newest row describes the dataset&apos;s latest reading; every other row is a
            stored historical reading.
          </caption>
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="text-muted-foreground">
              <th scope="col" className="border-b px-2 py-2 font-semibold">
                Reading time (WAT)
              </th>
              <th scope="col" className="border-b px-2 py-2 text-right font-semibold">
                Value
              </th>
              <th scope="col" className="border-b px-2 py-2 text-right font-semibold">
                Change
              </th>
              <th scope="col" className="border-b px-2 py-2 font-semibold">
                Source
              </th>
              <th scope="col" className="border-b px-2 py-2 font-semibold">
                State
              </th>
            </tr>
          </thead>
          <tbody>
            {newestFirst.map(({ point, previous }, rowIndex) => {
              const delta = previous ? round4(point.value - previous.value) : null;
              const pct = previous && previous.value > 0 ? round2((delta! / previous.value) * 100) : null;
              const change =
                previous === null
                  ? "—"
                  : delta === 0
                    ? "no change"
                    : `${delta! > 0 ? "▲ +" : "▼ −"}${formatValue(Math.abs(delta!))}${
                        pct === null ? "" : ` (${pct > 0 ? "+" : ""}${pct}%)`
                      }`;
              return (
                <tr key={`${point.sourceTime}-${point.value}-${rowIndex}`} className="align-top">
                  <th scope="row" className="border-b border-border/60 px-2 py-2 font-normal tabular-nums">
                    <span className="block">{formatWatFull(historyPointTimeMs(point))}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      recorded {point.observedAt.slice(0, 16).replace("T", " ")} UTC
                    </span>
                  </th>
                  <td className="border-b border-border/60 px-2 py-2 text-right font-semibold tabular-nums">
                    {formatValue(point.value)}
                  </td>
                  <td
                    className="border-b border-border/60 px-2 py-2 text-right tabular-nums"
                    title={
                      previous
                        ? `Previous stored reading ${formatValue(previous.value)} on ${formatWatFull(historyPointTimeMs(previous))}`
                        : "First stored reading for this series"
                    }
                  >
                    {change}
                  </td>
                  <td className="border-b border-border/60 px-2 py-2">
                    {sourceUrl ? (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {sourceName}
                      </a>
                    ) : (
                      <span>{sourceName}</span>
                    )}
                  </td>
                  <td className="border-b border-border/60 px-2 py-2">
                    {rowIndex === 0 ? (
                      <Badge variant="accent">{currentStateLabel}</Badge>
                    ) : (
                      <Badge variant="muted">Stored reading</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {points.length} of {maxPoints} stored readings shown, newest first. Scroll the table horizontally on a narrow
        screen. The badge on the newest row is the dataset&apos;s current verification state; older rows are labelled
        stored readings so a stale value is never dressed up as live.
      </p>
    </div>
  );
}
