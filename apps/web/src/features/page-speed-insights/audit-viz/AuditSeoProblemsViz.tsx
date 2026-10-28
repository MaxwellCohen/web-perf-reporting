"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import {
  Attribution,
  groupAcross,
  hasAnyItems,
  plural,
  reportsOf,
  subItemsOf,
  textOf,
  type AnyItem,
} from "./qualityVizShared";

export const SEO_PROBLEM_AUDIT_IDS = new Set([
  "crawlable-anchors",
  "hreflang",
  "canonical",
  "robots-txt",
  "is-crawlable",
]);

type Problem = { title: string; detail: string };

function describe(item: AnyItem): Problem | undefined {
  const node = item.node as { snippet?: string; selector?: string } | undefined;
  const source = item.source as { snippet?: string; selector?: string } | string | undefined;
  const sourceText =
    typeof source === "object" && source ? source.snippet || source.selector || "" : textOf(source);
  const subReasons = subItemsOf(item)
    .map((sub) => textOf(sub.reason) || textOf(sub.message))
    .filter(Boolean);
  const lineNo = textOf(item.index);

  const title =
    textOf(item.message) ||
    textOf(item.reason) ||
    textOf(item.href) ||
    node?.snippet ||
    node?.selector ||
    sourceText ||
    textOf(item.url) ||
    textOf(item.line);
  if (!title) return undefined;

  const detail = [
    subReasons.join("; "),
    lineNo && textOf(item.line) ? `line ${lineNo}: ${textOf(item.line)}` : "",
    textOf(item.message) && sourceText ? sourceText : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return { title, detail };
}

export function AuditSeoProblemsViz({ rows }: { rows: DetailTableItem[] }) {
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return null;
  const multi = rows.length > 1;

  const problems = groupAcross(
    reports,
    (item) => {
      const problem = describe(item);
      return problem ? `${problem.title}\u0000${problem.detail}` : undefined;
    },
    () => ({}),
  );
  if (!problems.length) return null;

  return (
    <div className="w-full min-w-0 space-y-1.5">
      <p className="text-xs text-muted-foreground">{plural(problems.length, "problem")} found</p>
      <ul className="divide-y overflow-hidden rounded-md border text-sm">
        {problems.map((problem) => {
          const [title, detail] = problem.key.split("\u0000");
          return (
            <li key={problem.key} className="px-2.5 py-1.5">
              <p className="break-words font-mono text-xs">{title}</p>
              <p className="truncate text-xs text-muted-foreground" title={detail}>
                {detail}
                {problem.count > 1 ? `${detail ? " · " : ""}×${problem.count}` : ""}
                <Attribution labels={problem.labels} multi={multi} />
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
