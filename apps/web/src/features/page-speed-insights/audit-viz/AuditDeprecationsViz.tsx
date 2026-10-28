"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { shortUrl } from "@/features/page-speed-insights/shared/format";
import {
  Attribution,
  groupAcross,
  hasAnyItems,
  plural,
  reportsOf,
  textOf,
  urlOf,
  type AnyItem,
} from "./qualityVizShared";

function locationOf(item: AnyItem): string {
  const loc = (item.source ?? item.sourceLocation) as
    | { url?: unknown; line?: unknown; column?: unknown }
    | string
    | undefined;
  if (!loc) return "";
  if (typeof loc === "string") return shortUrl(loc);
  const url = urlOf(loc);
  if (!url) return "";
  const line = typeof loc.line === "number" ? loc.line + 1 : undefined;
  return line != null ? `${shortUrl(url)}:${line}` : shortUrl(url);
}

export function AuditDeprecationsViz({ rows }: { rows: DetailTableItem[] }) {
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return null;
  const multi = rows.length > 1;

  const deprecations = groupAcross(
    reports,
    (item) => textOf(item.value) || textOf(item.description) || textOf(item.message) || undefined,
    () => new Set<string>(),
    (locations, item) => {
      const location = locationOf(item);
      if (location) locations.add(location);
    },
  );
  if (!deprecations.length) return null;

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {plural(deprecations.length, "deprecated API")} in use
      </p>
      <ul className="divide-y overflow-hidden rounded-md border text-sm">
        {deprecations.map((entry) => (
          <li key={entry.key} className="px-2.5 py-1.5">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words">{entry.key}</p>
              {entry.count > 1 ? (
                <span className="shrink-0 font-mono text-xs tabular-nums text-amber-700 dark:text-amber-300">
                  ×{entry.count}
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {[...entry.data].slice(0, 3).join(", ") || "unknown source"}
              <Attribution labels={entry.labels} multi={multi} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
