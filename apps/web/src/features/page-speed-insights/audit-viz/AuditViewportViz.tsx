"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { cn } from "@/lib/utils";
import { hasAnyItems, reportLabel, rowItems } from "./performanceVizShared";

const CONTENT_RE = /\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i;

function viewportContentFromSnippet(snippet: unknown): string | undefined {
  if (typeof snippet !== "string") return undefined;
  const match = snippet.match(CONTENT_RE);
  return match ? (match[1] ?? match[2]) : undefined;
}

export function AuditViewportViz({ rows }: { rows: DetailTableItem[] }) {
  if (!hasAnyItems(rows)) return null;
  const multi = rows.length > 1;

  return (
    <div className="mb-4 w-full min-w-0 space-y-2">
      {rows.map((row, index) => {
        const label = reportLabel(row, index);
        const items = rowItems(row);
        const node = items[0]?.node as { snippet?: string } | undefined;
        const content = viewportContentFromSnippet(node?.snippet);
        const pass = items.length > 0 && !!content;
        return (
          <div
            key={`${label}-${index}`}
            className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm"
            data-testid="viewport-row"
          >
            {multi ? (
              <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                pass
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
              )}
            >
              {pass ? "✓ Viewport meta tag" : "✗ No viewport meta tag"}
            </span>
            {content ? (
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                content=&quot;{content}&quot;
              </code>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
