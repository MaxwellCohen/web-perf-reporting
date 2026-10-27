"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { getAuditId } from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import { ImageDeliveryCause } from "@/features/page-speed-insights/ImageDeliveryCause";
import type { AuditResult, TableItem } from "@/lib/schema";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { getNumber } from "@/lib/utils";
import { buildGroupedComparison } from "@/features/page-speed-insights/shared/comparisonChartData";
import { formatAxisMs } from "@/features/page-speed-insights/shared/horizontalBarChart";
import { ReportComparisonBarChart } from "@/features/page-speed-insights/shared/ReportComparisonBarChart";
import { AuditBarChart } from "./AuditBarChart";
import { AuditStackedBarChart } from "./AuditStackedBarChart";
import { AuditGanttStrip, AuditRedirectChain } from "./AuditGanttStrip";
import { AuditKpiStrip } from "./AuditKpiStrip";
import { AuditLcpPhaseViz, AuditInpPhaseViz } from "./AuditLcpInpPhaseViz";
import { AuditNetworkWaterfallViz } from "./AuditNetworkWaterfallViz";
import { AuditResourceSummaryViz } from "./AuditResourceSummaryViz";
import {
  AuditSeverityFindingsViz,
  SECURITY_SEVERITY_AUDIT_IDS,
} from "./AuditSeverityFindingsViz";
import { AuditSourceMapsViz } from "./AuditSourceMapsViz";
import { AuditClsCulpritsViz } from "./AuditClsCulpritsViz";
import {
  extractBarPoints,
  extractDomSizeKpis,
  extractStackedSegmentPoints,
} from "./extractAuditBarPoints";
import { itemNumeric } from "./auditItemValues";

const BYTES_URL_AUDITS = new Set([
  "duplicated-javascript-insight",
  "legacy-javascript-insight",
  "unminified-css",
  "unminified-javascript",
  "unused-css-rules",
  "total-byte-weight",
]);

const MS_URL_AUDITS = new Set([
  "font-display-insight",
  "render-blocking-insight",
  "forced-reflow-insight",
]);

function bytesLabelKeys(auditId: string): readonly string[] {
  if (auditId === "duplicated-javascript-insight") return ["source", "url"];
  if (auditId === "forced-reflow-insight") return ["source", "url"];
  return ["url", "origin", "source"];
}

function bytesValueKeys(auditId: string): readonly string[] {
  if (auditId === "total-byte-weight") return ["totalBytes"];
  if (auditId === "forced-reflow-insight") return ["reflowTime"];
  if (MS_URL_AUDITS.has(auditId)) return ["wastedMs"];
  return ["wastedBytes", "totalBytes"];
}

export function AuditTableViz({ rows }: { rows: DetailTableItem[] }) {
  const auditId = getAuditId(rows);
  if (!auditId) return null;

  if (BYTES_URL_AUDITS.has(auditId) || MS_URL_AUDITS.has(auditId)) {
    const unit = MS_URL_AUDITS.has(auditId) || auditId === "forced-reflow-insight" ? "ms" : "bytes";
    const points = extractBarPoints(rows, {
      labelKeys: bytesLabelKeys(auditId),
      valueKeys: bytesValueKeys(auditId),
      limit: 12,
    });
    const title =
      auditId === "total-byte-weight"
        ? "Largest transfers"
        : unit === "ms"
          ? "Potential time savings"
          : "Potential byte savings";
    const pageTotal =
      auditId === "total-byte-weight"
        ? rows.map((row) => {
            const numericValue = getNumber((row.auditResult as AuditResult | undefined)?.numericValue);
            const fallback = (row.auditResult?.details?.items || []).reduce(
              (sum, item) => sum + (itemNumeric(item, ["totalBytes"]) ?? 0),
              0,
            );
            return {
              reportLabel: row._userLabel || "Report",
              metrics: [
                {
                  label: "Page transfer",
                  value: numericValue ?? fallback,
                  format: "bytes" as const,
                },
              ],
            };
          })
        : null;

    return (
      <div className="mb-4 space-y-3">
        {pageTotal ? <AuditKpiStrip groups={pageTotal} /> : null}
        <AuditBarChart points={points} unit={unit} title={title} />
      </div>
    );
  }

  if (auditId === "unused-javascript") {
    const points = extractStackedSegmentPoints(rows, {
      labelKeys: ["url"],
      segments: [],
      usedUnusedFromBytes: true,
      limit: 12,
    });
    return (
      <div className="mb-4">
        <AuditStackedBarChart
          points={points}
          segmentOrder={["used", "unused"]}
          segmentLabels={{ used: "Used", unused: "Unused" }}
          unit="bytes"
          title="Used vs unused JavaScript"
        />
      </div>
    );
  }

  if (auditId === "third-parties-insight" || auditId === "third-parties-details") {
    const transfer = extractBarPoints(rows, {
      labelKeys: ["entity", "url"],
      valueKeys: ["transferSize"],
      limit: 10,
    });
    const mainThread = extractBarPoints(rows, {
      labelKeys: ["entity", "url"],
      valueKeys: ["mainThreadTime"],
      limit: 10,
    });
    return (
      <div className="mb-4 space-y-4">
        <AuditBarChart points={transfer} unit="bytes" title="Transfer size by entity" />
        <AuditBarChart points={mainThread} unit="ms" title="Main-thread time by entity" />
      </div>
    );
  }

  if (auditId === "image-delivery-insight") {
    const entries = rows
      .filter((row) => row.auditResult)
      .map((row) => ({
        audit: row.auditResult as unknown as AuditResult,
        label: row._userLabel || "Report",
      }));
    if (!entries.length) return null;
    return (
      <div className="mb-4">
        <ImageDeliveryCause entries={entries} />
      </div>
    );
  }

  if (auditId === "lcp-breakdown-insight") {
    return (
      <div className="mb-4">
        <AuditLcpPhaseViz rows={rows} />
      </div>
    );
  }

  if (auditId === "inp-breakdown-insight") {
    return (
      <div className="mb-4">
        <AuditInpPhaseViz rows={rows} />
      </div>
    );
  }

  if (auditId === "mainthread-work-breakdown") {
    const points = rows.flatMap(({ _userLabel, auditResult }) =>
      ((auditResult?.details?.items || []) as TableItem[]).map((item) => {
        const group = typeof item.group === "string" ? item.group : "";
        const groupLabel = typeof item.groupLabel === "string" ? item.groupLabel : "";
        return {
          label: _userLabel || "Report",
          category: groupLabel || toTitleCase(group) || "Other",
          value: getNumber(item.duration) ?? 0,
        };
      }),
    );
    const { series, rows: chartRows } = buildGroupedComparison(points, { limit: 8 });
    if (!chartRows.length) return null;
    return (
      <div className="mb-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Main-thread work by category</p>
        <ReportComparisonBarChart
          data={chartRows}
          series={series}
          formatValue={formatAxisMs}
          yAxis={{ min: 100, max: 160 }}
          showValueAxis
        />
      </div>
    );
  }

  if (auditId === "bootup-time") {
    const points = extractStackedSegmentPoints(rows, {
      labelKeys: ["url"],
      segments: [
        { key: "scripting", valueKeys: ["scripting"] },
        { key: "scriptParseCompile", valueKeys: ["scriptParseCompile"] },
      ],
      limit: 12,
    });
    return (
      <div className="mb-4">
        <AuditStackedBarChart
          points={points}
          segmentOrder={["scripting", "scriptParseCompile"]}
          segmentLabels={{ scripting: "Scripting", scriptParseCompile: "Parse / compile" }}
          unit="ms"
          title="JavaScript bootup time"
        />
      </div>
    );
  }

  if (auditId === "long-tasks") {
    return (
      <div className="mb-4">
        <AuditGanttStrip
          rows={rows}
          labelKeys={["url"]}
          title="Long tasks"
          barClassName="bg-destructive/80"
          limit={16}
        />
      </div>
    );
  }

  if (auditId === "main-thread-tasks") {
    return (
      <div className="mb-4">
        <AuditGanttStrip
          rows={rows}
          labelKeys={["url", "name"]}
          title="Main-thread tasks"
          limit={24}
          barClassName="bg-amber-500/80"
        />
      </div>
    );
  }

  if (auditId === "user-timings") {
    return (
      <div className="mb-4">
        <AuditGanttStrip
          rows={rows}
          labelKeys={["name"]}
          title="User timings"
          limit={20}
          barClassName="bg-sky-500/80"
        />
      </div>
    );
  }

  if (auditId === "redirects") {
    return (
      <div className="mb-4">
        <AuditRedirectChain rows={rows} />
      </div>
    );
  }

  if (auditId === "cls-culprits-insight" || auditId === "layout-shifts") {
    return (
      <div className="mb-4">
        <AuditClsCulpritsViz rows={rows} />
      </div>
    );
  }

  if (auditId === "dom-size-insight") {
    const groups = extractDomSizeKpis(rows).map((group) => ({
      reportLabel: group.reportLabel,
      metrics: group.stats.map((stat) => ({
        label: stat.label,
        value: stat.value,
        format: "count" as const,
      })),
    }));
    return (
      <div className="mb-4">
        <AuditKpiStrip groups={groups} />
      </div>
    );
  }

  if (auditId === "network-rtt") {
    const points = extractBarPoints(rows, {
      labelKeys: ["origin"],
      valueKeys: ["rtt"],
      limit: 12,
    });
    return (
      <div className="mb-4">
        <AuditBarChart points={points} unit="ms" title="RTT by origin" />
      </div>
    );
  }

  if (auditId === "network-server-latency") {
    const points = extractBarPoints(rows, {
      labelKeys: ["origin"],
      valueKeys: ["serverResponseTime"],
      limit: 12,
    });
    return (
      <div className="mb-4">
        <AuditBarChart points={points} unit="ms" title="Server latency by origin" />
      </div>
    );
  }

  if (auditId === "resource-summary") {
    return (
      <div className="mb-4">
        <AuditResourceSummaryViz rows={rows} />
      </div>
    );
  }

  if (auditId === "network-requests") {
    return (
      <div className="mb-4">
        <AuditNetworkWaterfallViz rows={rows} />
      </div>
    );
  }

  if (SECURITY_SEVERITY_AUDIT_IDS.has(auditId)) {
    return (
      <div className="mb-4">
        <AuditSeverityFindingsViz rows={rows} />
      </div>
    );
  }

  if (auditId === "valid-source-maps") {
    return (
      <div className="mb-4">
        <AuditSourceMapsViz rows={rows} />
      </div>
    );
  }

  return null;
}
