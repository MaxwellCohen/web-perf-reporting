"use client";

import { useMemo } from "react";
import { TableItem } from "@/lib/schema";
import {
  JavascriptBytesTableCard,
  type JavascriptBytesMetric,
} from "@/features/page-speed-insights/javascript-metrics/JavascriptBytesTableCard";

function mapToBytesMetrics<T extends { label: string }>(
  metrics: T[],
  pickItems: (m: T) => TableItem[],
): JavascriptBytesMetric[] {
  return metrics.map((m) => ({ label: m.label, items: pickItems(m) }));
}

type LegacyJavaScriptData = { label: string; legacyJS: TableItem[] };
type UnminifiedJavaScriptData = { label: string; unminifiedJS: TableItem[] };
type UnusedJavaScriptData = { label: string; unusedJS: TableItem[] };

export function LegacyJavaScriptCard({ metrics }: { metrics: LegacyJavaScriptData[] }) {
  "use no memo";
  const normalized = useMemo(
    () => mapToBytesMetrics(metrics, (m) => m.legacyJS),
    [metrics],
  );
  return <JavascriptBytesTableCard title="Legacy JavaScript" metrics={normalized} />;
}

export function UnminifiedJavaScriptCard({ metrics }: { metrics: UnminifiedJavaScriptData[] }) {
  "use no memo";
  const normalized = useMemo(
    () => mapToBytesMetrics(metrics, (m) => m.unminifiedJS),
    [metrics],
  );
  return <JavascriptBytesTableCard title="Unminified JavaScript" metrics={normalized} />;
}

export function UnusedJavaScriptCard({ metrics }: { metrics: UnusedJavaScriptData[] }) {
  "use no memo";
  const normalized = useMemo(() => mapToBytesMetrics(metrics, (m) => m.unusedJS), [metrics]);
  return (
    <JavascriptBytesTableCard title="Unused JavaScript" metrics={normalized} includeWastedPercent />
  );
}
