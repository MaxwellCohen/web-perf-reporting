"use client";

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
  const normalized = mapToBytesMetrics(metrics, (m) => m.legacyJS);
  return <JavascriptBytesTableCard title="Legacy JavaScript" metrics={normalized} />;
}

export function UnminifiedJavaScriptCard({ metrics }: { metrics: UnminifiedJavaScriptData[] }) {
  const normalized = mapToBytesMetrics(metrics, (m) => m.unminifiedJS);
  return <JavascriptBytesTableCard title="Unminified JavaScript" metrics={normalized} />;
}

export function UnusedJavaScriptCard({ metrics }: { metrics: UnusedJavaScriptData[] }) {
  const normalized = mapToBytesMetrics(metrics, (m) => m.unusedJS);
  return (
    <JavascriptBytesTableCard title="Unused JavaScript" metrics={normalized} includeWastedPercent />
  );
}
