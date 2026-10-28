"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { AuditKpiStrip } from "./AuditKpiStrip";
import {
  Attribution,
  Chip,
  groupAcross,
  hasAnyItems,
  hostOf,
  plural,
  reportsOf,
  textOf,
  urlOf,
} from "./qualityVizShared";

export function AuditThirdPartyCookiesViz({ rows }: { rows: DetailTableItem[] }) {
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return null;
  const multi = rows.length > 1;

  const origins = groupAcross(
    reports,
    (item) => {
      const url = urlOf(item.url);
      return url ? hostOf(url) : "unknown origin";
    },
    () => new Set<string>(),
    (names, item) => {
      const name = textOf(item.name);
      if (name) names.add(name);
    },
  );

  return (
    <div className="w-full min-w-0 space-y-3">
      <AuditKpiStrip
        groups={reports.map((report) => ({
          reportLabel: report.label,
          metrics: [
            { label: "Cookies", value: report.items.length, format: "count" },
            {
              label: "Origins",
              value: new Set(report.items.map((item) => hostOf(urlOf(item.url) || "unknown"))).size,
              format: "count",
            },
          ],
        }))}
      />
      <p className="text-xs text-muted-foreground">
        {plural(origins.length, "third-party origin")} setting cookies
      </p>
      <ul className="divide-y overflow-hidden rounded-md border text-sm">
        {origins.map((origin) => (
          <li key={origin.key} className="space-y-1 px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate font-medium" title={origin.key}>
                {origin.key}
                <Attribution labels={origin.labels} multi={multi} />
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-amber-700 dark:text-amber-300">
                {plural(origin.data.size, "cookie")}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {[...origin.data].map((name) => (
                <Chip key={name}>{name}</Chip>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
