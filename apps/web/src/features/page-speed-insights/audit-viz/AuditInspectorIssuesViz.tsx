"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { shortUrl } from "@/features/page-speed-insights/shared/format";
import { AuditBarChart } from "./AuditBarChart";
import {
  Attribution,
  groupAcross,
  hasAnyItems,
  hostOf,
  plural,
  reportsOf,
  subItemsOf,
  textOf,
  urlOf,
} from "./qualityVizShared";

export function AuditInspectorIssuesViz({ rows }: { rows: DetailTableItem[] }) {
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return null;
  const multi = rows.length > 1;

  const points = reports.flatMap((report) => {
    const counts = new Map<string, number>();
    report.items.forEach((item) => {
      const type = textOf(item.issueType) || "Unknown";
      counts.set(type, (counts.get(type) || 0) + Math.max(1, subItemsOf(item).length));
    });
    return [...counts].map(([category, value]) => ({ label: report.label, category, value }));
  });

  const types = groupAcross(
    reports,
    (item) => textOf(item.issueType) || "Unknown",
    () => new Set<string>(),
    (urls, item) => {
      subItemsOf(item).forEach((sub) => {
        const url = urlOf(sub.url);
        if (url) urls.add(url);
      });
    },
  );

  return (
    <div className="w-full min-w-0 space-y-3">
      <AuditBarChart points={points} unit="count" title="Affected resources by issue type" />
      <ul className="divide-y overflow-hidden rounded-md border text-sm">
        {types.map((type) => (
          <li key={type.key} className="space-y-1 px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">
                {type.key}
                <Attribution labels={type.labels} multi={multi} />
              </span>
              <span className="font-mono text-xs tabular-nums text-amber-700 dark:text-amber-300">
                {plural(type.data.size, "URL")}
              </span>
            </div>
            <ul className="space-y-0.5">
              {[...type.data].slice(0, 6).map((url) => (
                <li key={url} className="truncate text-xs text-muted-foreground" title={url}>
                  <span className="font-medium text-foreground">{hostOf(url)}</span>{" "}
                  {shortUrl(url).replace(hostOf(url), "")}
                </li>
              ))}
              {type.data.size > 6 ? (
                <li className="text-xs text-muted-foreground">+{type.data.size - 6} more</li>
              ) : null}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
