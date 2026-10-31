"use client";

import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { getAuditId } from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import { ImageDeliveryCause } from "@/features/page-speed-insights/ImageDeliveryCause";
import type { AuditResult } from "@/lib/schema";
import { getNumber } from "@/lib/utils";
import { formatBytes } from "@/features/page-speed-insights/shared/format";
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
import {
  PERFORMANCE_AUDIT_VIZ_IDS,
  PerformanceAuditViz,
} from "./performanceAuditViz";
import { QualityAuditViz } from "./qualityAuditViz";

const BYTES_URL_AUDITS = new Set([
  "duplicated-javascript-insight",
  "legacy-javascript-insight",
  "unminified-css",
  "unminified-javascript",
  "unused-css-rules",
  "total-byte-weight",
]);

function bytesLabelKeys(auditId: string): readonly string[] {
  if (auditId === "duplicated-javascript-insight") return ["source", "url"];
  return ["url", "origin", "source"];
}

/** Bar = full resource size: used part plus the part Lighthouse says could be saved. */
function usedVsSavingsLabel(segments: Record<string, number>): string {
  const used = segments.used ?? 0;
  const savings = segments.savings ?? 0;
  // Some audits (e.g. legacy-javascript-insight) only report wastedBytes, so no total is known.
  if (used <= 0) return `${formatBytes(savings)} savings`;
  return `used ${formatBytes(used)} / total ${formatBytes(used + savings)}`;
}

export function AuditTableViz({ rows }: { rows: DetailTableItem[] }) {
  const auditId = getAuditId(rows);
  if (!auditId) return null;

  if (BYTES_URL_AUDITS.has(auditId) && auditId !== "total-byte-weight") {
    const points = extractStackedSegmentPoints(rows, {
      labelKeys: bytesLabelKeys(auditId),
      segments: [],
      usedUnusedFromBytes: true,
      limit: 12,
    }).map((point) => ({
      ...point,
      segment: point.segment === "unused" ? "savings" : point.segment,
    }));
    return (
      <div className="mb-4">
        <AuditStackedBarChart
          points={points}
          segmentOrder={["used", "savings"]}
          segmentLabels={{ used: "Used", savings: "Potential savings" }}
          unit="bytes"
          title="Potential byte savings (bar = total size)"
          endLabel={usedVsSavingsLabel}
        />
      </div>
    );
  }

  // Time-savings audits (font-display, render-blocking, forced-reflow) are table-only.
  // total-byte-weight keeps only the page-size card; the table lists the largest transfers.
  if (auditId === "total-byte-weight") {
    const pageTotal = rows.map((row) => {
      const numericValue = getNumber(
        (row.auditResult as AuditResult | undefined)?.numericValue,
      );
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
    });

    return (
      <div className="mb-4 space-y-3">
        <AuditKpiStrip groups={pageTotal} />
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
          endLabel={(segments) =>
            usedVsSavingsLabel({
              used: segments.used ?? 0,
              savings: segments.unused ?? 0,
            })
          }
        />
      </div>
    );
  }

  if (
    auditId === "third-parties-insight" ||
    auditId === "third-parties-details"
  ) {
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
        <AuditBarChart
          points={transfer}
          unit="bytes"
          title="Transfer size by entity"
        />
        <AuditBarChart
          points={mainThread}
          unit="ms"
          title="Main-thread time by entity"
        />
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

  // mainthread-work-breakdown is table-only (MainThreadWorkBreakdownTable in DetailTable).
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
          segmentLabels={{
            scripting: "Scripting",
            scriptParseCompile: "Parse / compile",
          }}
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
        <AuditBarChart
          points={points}
          unit="ms"
          title="Server latency by origin"
        />
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

  if (PERFORMANCE_AUDIT_VIZ_IDS.has(auditId)) {
    return (
      <div className="mb-4">
        <PerformanceAuditViz rows={rows} />
      </div>
    );
  }

  return <QualityAuditViz rows={rows} />;
}
