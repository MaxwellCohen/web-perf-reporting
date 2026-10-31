"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { AuditKpiStrip } from "./AuditKpiStrip";
import {
  Attribution,
  groupAcross,
  hasAnyItems,
  plural,
  reportsOf,
  textOf,
  type AnyItem,
} from "./qualityVizShared";

/** Audits that have node items but are visualized elsewhere or are not "failing elements" lists. */
const NODE_FINDINGS_EXCLUDED_IDS = new Set([
  "valid-source-maps",
  "has-hsts",
  "csp-xss",
  "origin-isolation",
  "clickjacking-mitigation",
  "trusted-types-xss",
  "dom-size",
  "layout-shifts",
  "layout-shift-elements",
  "largest-contentful-paint-element",
  "lcp-lazy-loaded",
  "prioritize-lcp-image",
  "unsized-images",
  "image-size-responsive",
  "image-aspect-ratio",
  "non-composited-animations",
  "viewport",
  "tap-targets",
  "crawlable-anchors",
  "is-crawlable",
  "hreflang",
  "canonical",
  "robots-txt",
  "link-text",
]);

type NodeLike = {
  type?: string;
  snippet?: string;
  selector?: string;
  nodeLabel?: string;
  explanation?: string;
};

function nodeOf(item: AnyItem): NodeLike | undefined {
  const node = item.node as NodeLike | undefined;
  return node && typeof node === "object" && node.type === "node" ? node : undefined;
}

/** True when every item (in every report) has a node and the audit is not already handled. */
export function isNodeFindingsAudit(rows: DetailTableItem[], auditId?: string): boolean {
  const id = auditId ?? rows[0]?.auditResult?.id;
  if (id && NODE_FINDINGS_EXCLUDED_IDS.has(id)) return false;
  const reports = reportsOf(rows);
  if (!hasAnyItems(reports)) return false;
  return reports.every((report) => report.items.every((item) => nodeOf(item)));
}

type ContrastInfo = { ratio?: number; fg?: string; bg?: string; expected?: string };

const COLOR_RE = /(#[0-9a-f]{3,8}|rgba?\([^)]*\))/i;

function parseContrast(explanation: string | undefined): ContrastInfo | undefined {
  if (!explanation) return undefined;
  const ratio = explanation.match(/contrast of\s+(\d+(?:\.\d+)?)/i);
  const fg = explanation.match(/foreground color:\s*([^,)]+(?:\([^)]*\))?)/i);
  const bg = explanation.match(/background color:\s*([^,)]+(?:\([^)]*\))?)/i);
  const expected = explanation.match(/Expected contrast ratio of\s+([\d.]+:1)/i);
  const fgColor = fg?.[1].match(COLOR_RE)?.[1];
  const bgColor = bg?.[1].match(COLOR_RE)?.[1];
  if (!ratio && !fgColor && !bgColor) return undefined;
  return {
    ratio: ratio ? Number(ratio[1]) : undefined,
    fg: fgColor,
    bg: bgColor,
    expected: expected?.[1],
  };
}

function Swatch({ color, label }: { color?: string; label: string }) {
  if (!color) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span
        aria-label={`${label} ${color}`}
        className="inline-block size-3.5 rounded-sm border"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono">{color}</span>
    </span>
  );
}

const MAX_LIST = 8;

function firstLine(explanation: string | undefined): string {
  if (!explanation) return "";
  const lines = explanation
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^fix (any|all) of the following/i.test(line));
  return lines[0] || "";
}

export function AuditNodeFindingsViz({ rows }: { rows: DetailTableItem[] }) {
  if (!isNodeFindingsAudit(rows)) return null;
  const reports = reportsOf(rows);
  const multi = rows.length > 1;
  const isContrast = rows[0]?.auditResult?.id === "color-contrast";

  const elements = groupAcross(
    reports,
    (item) => {
      const node = nodeOf(item);
      return node?.selector || node?.snippet || node?.nodeLabel;
    },
    () => ({ node: undefined as NodeLike | undefined, contrast: undefined as ContrastInfo | undefined }),
    (data, item) => {
      const node = nodeOf(item);
      data.node = data.node ?? node;
      data.contrast = data.contrast ?? (isContrast ? parseContrast(node?.explanation) : undefined);
    },
  );

  return (
    <div className="w-full min-w-0 space-y-3">
      <AuditKpiStrip
        groups={reports.map((report) => ({
          reportLabel: report.label,
          metrics: [{ label: "Failing elements", value: report.items.length, format: "count" }],
        }))}
      />
      <ul className="divide-y overflow-hidden rounded-md border text-sm">
        {elements.slice(0, MAX_LIST).map((element) => {
          const { node, contrast } = element.data;
          const hint = firstLine(node?.explanation);
          return (
            <li key={element.key} className="space-y-0.5 px-2.5 py-1.5">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate font-mono text-xs" title={element.key}>
                  {node?.snippet || element.key}
                </p>
                {element.count > 1 ? (
                  <span className="shrink-0 font-mono text-xs tabular-nums">×{element.count}</span>
                ) : null}
              </div>
              {contrast ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  {contrast.ratio != null ? (
                    <span className="font-mono text-xs tabular-nums text-red-700 dark:text-red-300">
                      {contrast.ratio}:1
                      {contrast.expected ? ` (needs ${contrast.expected})` : ""}
                    </span>
                  ) : null}
                  <Swatch color={contrast.fg} label="Foreground" />
                  <Swatch color={contrast.bg} label="Background" />
                </div>
              ) : hint ? (
                <p className="truncate text-xs text-muted-foreground" title={hint}>
                  {hint}
                </p>
              ) : null}
              <p className="truncate text-xs text-muted-foreground">
                {textOf(node?.nodeLabel)}
                <Attribution labels={element.labels} multi={multi} />
              </p>
            </li>
          );
        })}
      </ul>
      {elements.length > MAX_LIST ? (
        <p className="text-xs text-muted-foreground">
          +{plural(elements.length - MAX_LIST, "more element")} in the table below
        </p>
      ) : null}
    </div>
  );
}
