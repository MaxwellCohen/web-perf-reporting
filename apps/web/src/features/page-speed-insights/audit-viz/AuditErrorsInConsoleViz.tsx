"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { AuditKpiStrip } from "./AuditKpiStrip";
import { AuditBarChart } from "./AuditBarChart";
import {
  Attribution,
  groupAcross,
  hasAnyItems,
  hostOf,
  plural,
  reportsOf,
  textOf,
  urlOf,
  type AnyItem,
} from "./qualityVizShared";

function sourceOf(item: AnyItem): string {
  const raw = textOf(item.source) || textOf((item.sourceLocation as { urlProvider?: unknown })?.urlProvider);
  const lower = raw.toLowerCase();
  if (lower === "network") return "network";
  if (lower === "javascript") return "javascript";
  return "other";
}

function originOf(item: AnyItem): string {
  const url = urlOf(item.sourceLocation) || urlOf(item.url);
  return url ? hostOf(url) : "unknown origin";
}

export function AuditErrorsInConsoleViz({ rows }: { rows: DetailTableItem[] }) {
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return null;
  const multi = rows.length > 1;

  const sourcePoints = reports.flatMap((report) => {
    const counts = new Map<string, number>();
    report.items.forEach((item) => counts.set(sourceOf(item), (counts.get(sourceOf(item)) || 0) + 1));
    return [...counts].map(([category, value]) => ({ label: report.label, category, value }));
  });
  const originPoints = reports.flatMap((report) => {
    const counts = new Map<string, number>();
    report.items.forEach((item) => counts.set(originOf(item), (counts.get(originOf(item)) || 0) + 1));
    return [...counts].map(([category, value]) => ({ label: report.label, category, value }));
  });

  const messages = groupAcross(
    reports,
    (item) => textOf(item.description) || "(no message)",
    () => ({ source: "other", origin: "" }),
    (data, item) => {
      data.source = sourceOf(item);
      data.origin = data.origin || originOf(item);
    },
  );

  return (
    <div className="w-full min-w-0 space-y-3">
      <AuditKpiStrip
        groups={reports.map((report) => ({
          reportLabel: report.label,
          metrics: [
            { label: "Errors", value: report.items.length, format: "count" },
            ...["network", "javascript", "other"]
              .map((source) => ({
                label: source[0].toUpperCase() + source.slice(1),
                value: report.items.filter((item) => sourceOf(item) === source).length,
                format: "count" as const,
              }))
              .filter((metric) => metric.value > 0),
          ],
        }))}
      />
      <AuditBarChart points={sourcePoints} unit="count" title="Errors by source" />
      <AuditBarChart points={originPoints} unit="count" limit={8} title="Errors by origin" />
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          {plural(messages.length, "unique message")}
        </p>
        <ul className="divide-y overflow-hidden rounded-md border text-sm">
          {messages.map((message) => (
            <li key={message.key} className="px-2.5 py-1.5">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words">{message.key}</p>
                <span className="shrink-0 font-mono text-xs tabular-nums text-red-700 dark:text-red-300">
                  ×{message.count}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground" title={message.data.origin}>
                {message.data.source} · {message.data.origin}
                <Attribution labels={message.labels} multi={multi} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
