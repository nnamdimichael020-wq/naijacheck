import { LIVE_FUEL, LIVE_FX } from "@/lib/live";
import { DATASET_REGISTRY } from "@/lib/source-registry";
import { LiveMicroBar, type MicroReading } from "@/components/live/micro-bar";

/** The static export embeds the last saved monitor snapshot, not a streaming feed. */
export function LiveTicker() {
  const cbn = DATASET_REGISTRY.find((d) => d.id === "cbn-usd")!;
  const parallel = DATASET_REGISTRY.find((d) => d.id === "parallel-fx")!;
  const fuel = DATASET_REGISTRY.find((d) => d.id === "fuel-depot")!;
  const readings: MicroReading[] = [
    { label: "CBN USD", value: LIVE_FX.official.USD, unit: "/US$", href: "/status", record: cbn },
    { label: "Parallel USD buy", value: LIVE_FX.blackMarket?.USD.buy ?? null, unit: "/US$", href: "/status", record: parallel },
    { label: "Petrol depot median", value: LIVE_FUEL.medians.petrol, unit: "/L", href: "/prices/fuel", record: fuel },
  ].map(({ label, value, unit, href, record }) => ({
    label,
    value: typeof value === "number" && Number.isFinite(value) && value > 0 ? `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 2 })}${unit}` : "Unavailable",
    href,
    checkedAt: record.checkedAt,
    sourceTime: record.sourceTime,
    state: record.state,
    staleAfterHours: record.staleAfterHours,
  }));

  return <LiveMicroBar readings={readings} />;
}
