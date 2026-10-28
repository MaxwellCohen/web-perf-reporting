"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { shortUrl } from "@/features/page-speed-insights/shared/format";
import { Attribution, groupAcross, hasAnyItems, plural, reportsOf, textOf } from "./qualityVizShared";

export function AuditLinkTextViz({ rows }: { rows: DetailTableItem[] }) {
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return null;
  const multi = rows.length > 1;

  const groups = groupAcross(
    reports,
    (item) => textOf(item.text) || "(empty link text)",
    () => new Set<string>(),
    (hrefs, item) => {
      const href = textOf(item.href);
      if (href) hrefs.add(href);
    },
  );

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {plural(groups.reduce((n, g) => n + g.count, 0), "link")} with non-descriptive text ·{" "}
        {plural(groups.length, "distinct label")}
      </p>
      <ul className="divide-y overflow-hidden rounded-md border text-sm">
        {groups.map((group) => (
          <li key={group.key} className="px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">
                “{group.key}”
                <Attribution labels={group.labels} multi={multi} />
              </span>
              <span className="font-mono text-xs tabular-nums text-amber-700 dark:text-amber-300">
                ×{group.count}
              </span>
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {plural(group.data.size, "href")}
              </summary>
              <ul className="mt-1 space-y-0.5">
                {[...group.data].map((href) => (
                  <li key={href} className="truncate text-xs text-muted-foreground" title={href}>
                    {shortUrl(href)}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
