"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { Chip, groupAcross, hasAnyItems, plural, reportsOf, textOf } from "./qualityVizShared";

function cleanVersion(name: string, version: string): string {
  // Lighthouse sometimes reports e.g. "core-js-global@3.9.1".
  const at = version.lastIndexOf("@");
  const v = at >= 0 ? version.slice(at + 1) : version;
  return v === name ? "" : v;
}

export function AuditJsLibrariesViz({ rows }: { rows: DetailTableItem[] }) {
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return null;
  const multi = rows.length > 1;
  const total = reports.length;

  const libs = groupAcross(
    reports,
    (item) => textOf(item.name) || textOf(item.npm) || undefined,
    () => new Set<string>(),
    (versions, item) => {
      const v = cleanVersion(textOf(item.name), textOf(item.version));
      if (v) versions.add(v);
    },
  ).sort((a, b) => a.key.localeCompare(b.key));
  if (!libs.length) return null;

  const partial = multi ? libs.filter((lib) => lib.labels.length < total) : [];

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {plural(libs.length, "library")} detected
        {partial.length ? ` · ${partial.length} not in every report` : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {libs.map((lib) => {
          const isPartial = multi && lib.labels.length < total;
          const version = [...lib.data].join(" / ");
          return (
            <span key={lib.key} title={isPartial ? `Only in ${lib.labels.join(", ")}` : undefined}>
              <Chip tone={isPartial ? "warn" : undefined}>
                {lib.key}
                {version ? ` ${version}` : ""}
                {isPartial ? ` (only ${lib.labels.join(", ")})` : ""}
              </Chip>
            </span>
          );
        })}
      </div>
    </div>
  );
}
