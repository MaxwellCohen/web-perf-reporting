import type { ComponentType } from "react";
import type { DetailTableItem } from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import { getAuditId } from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import { ImageDeliveryCause } from "@/features/page-speed-insights/ImageDeliveryCause";
import { getNumber } from "@/lib/utils";
import { formatBytes } from "@/features/page-speed-insights/shared/format";
import { AuditBarChart } from "./AuditBarChart";
import { AuditStackedBarChart } from "./AuditStackedBarChart";
import { AuditGanttStrip, AuditRedirectChain } from "./AuditGanttStrip";
import { AuditKpiStrip } from "./AuditKpiStrip";
import { AuditLcpPhaseViz, AuditInpPhaseViz } from "./AuditLcpInpPhaseViz";
import { AuditNetworkWaterfallViz } from "./AuditNetworkWaterfallViz";
import { AuditResourceSummaryViz } from "./AuditResourceSummaryViz";
import { AuditSeverityFindingsViz, SECURITY_SEVERITY_AUDIT_IDS } from "./AuditSeverityFindingsViz";
import { AuditSourceMapsViz } from "./AuditSourceMapsViz";
import { AuditClsCulpritsViz } from "./AuditClsCulpritsViz";
import {
  extractBarPoints,
  extractDomSizeKpis,
  extractStackedSegmentPoints,
} from "./extractAuditBarPoints";
import { itemNumeric } from "./auditItemValues";
import { AuditImageIssuesViz, IMAGE_ISSUE_AUDIT_IDS } from "./AuditImageIssuesViz";
import { AuditServerResponseTimeViz } from "./AuditServerResponseTimeViz";
import { AuditViewportViz } from "./AuditViewportViz";
import { AuditDeprecationsViz } from "./AuditDeprecationsViz";
import { AuditErrorsInConsoleViz } from "./AuditErrorsInConsoleViz";
import { AuditInspectorIssuesViz } from "./AuditInspectorIssuesViz";
import { AuditJsLibrariesViz } from "./AuditJsLibrariesViz";
import { AuditLinkTextViz } from "./AuditLinkTextViz";
import { AuditNodeFindingsViz, isNodeFindingsAudit } from "./AuditNodeFindingsViz";
import { AuditSeoProblemsViz, SEO_PROBLEM_AUDIT_IDS } from "./AuditSeoProblemsViz";
import { AuditThirdPartyCookiesViz } from "./AuditThirdPartyCookiesViz";

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

type VizProps = { rows: DetailTableItem[]; auditId: string };
type VizEntry = { Viz: ComponentType<VizProps>; wrap?: string };

function BytesSavingsViz({ rows, auditId }: VizProps) {
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
    <AuditStackedBarChart
      points={points}
      segmentOrder={["used", "savings"]}
      segmentLabels={{ used: "Used", savings: "Potential savings" }}
      unit="bytes"
      title="Potential byte savings (bar = total size)"
      endLabel={usedVsSavingsLabel}
    />
  );
}

// Time-savings audits (font-display, render-blocking, forced-reflow) are table-only.
// total-byte-weight keeps only the page-size card; the table lists the largest transfers.
function TotalByteWeightViz({ rows }: VizProps) {
  const pageTotal = rows.map((row) => {
    const numericValue = getNumber(row.auditResult?.numericValue);
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
  return <AuditKpiStrip groups={pageTotal} />;
}

function UnusedJavascriptViz({ rows }: VizProps) {
  const points = extractStackedSegmentPoints(rows, {
    labelKeys: ["url"],
    segments: [],
    usedUnusedFromBytes: true,
    limit: 12,
  });
  return (
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
  );
}

function ThirdPartiesViz({ rows }: VizProps) {
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
    <>
      <AuditBarChart points={transfer} unit="bytes" title="Transfer size by entity" />
      <AuditBarChart points={mainThread} unit="ms" title="Main-thread time by entity" />
    </>
  );
}

function ImageDeliveryViz({ rows }: VizProps) {
  const entries = rows
    .filter((row) => row.auditResult)
    .map((row) => ({
      audit: row.auditResult,
      label: row._userLabel || "Report",
    }));
  if (!entries.length) return null;
  return (
    <div className="mb-4">
      <ImageDeliveryCause entries={entries} />
    </div>
  );
}

// mainthread-work-breakdown is table-only (MainThreadWorkBreakdownTable in DetailTable).
function BootupTimeViz({ rows }: VizProps) {
  const points = extractStackedSegmentPoints(rows, {
    labelKeys: ["url"],
    segments: [
      { key: "scripting", valueKeys: ["scripting"] },
      { key: "scriptParseCompile", valueKeys: ["scriptParseCompile"] },
    ],
    limit: 12,
  });
  return (
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
  );
}

function LongTasksViz({ rows }: VizProps) {
  return (
    <AuditGanttStrip
      rows={rows}
      labelKeys={["url"]}
      title="Long tasks"
      barClassName="bg-destructive/80"
      limit={16}
    />
  );
}

function MainThreadTasksViz({ rows }: VizProps) {
  return (
    <AuditGanttStrip
      rows={rows}
      labelKeys={["url", "name"]}
      title="Main-thread tasks"
      limit={24}
      barClassName="bg-amber-500/80"
    />
  );
}

function UserTimingsViz({ rows }: VizProps) {
  return (
    <AuditGanttStrip
      rows={rows}
      labelKeys={["name"]}
      title="User timings"
      limit={20}
      barClassName="bg-sky-500/80"
    />
  );
}

function DomSizeViz({ rows }: VizProps) {
  const groups = extractDomSizeKpis(rows).map((group) => ({
    reportLabel: group.reportLabel,
    metrics: group.stats.map((stat) => ({
      label: stat.label,
      value: stat.value,
      format: "count" as const,
    })),
  }));
  return <AuditKpiStrip groups={groups} />;
}

function NetworkRttViz({ rows }: VizProps) {
  const points = extractBarPoints(rows, {
    labelKeys: ["origin"],
    valueKeys: ["rtt"],
    limit: 12,
  });
  return <AuditBarChart points={points} unit="ms" title="RTT by origin" />;
}

function NetworkServerLatencyViz({ rows }: VizProps) {
  const points = extractBarPoints(rows, {
    labelKeys: ["origin"],
    valueKeys: ["serverResponseTime"],
    limit: 12,
  });
  return <AuditBarChart points={points} unit="ms" title="Server latency by origin" />;
}

/** Audit id -> viz. `wrap` is the container className; use "" for vizzes that own their layout. */
export const AUDIT_VIZ_REGISTRY = new Map<string, VizEntry>();

function register(ids: Iterable<string>, Viz: VizEntry["Viz"], wrap = "mb-4") {
  for (const id of ids) AUDIT_VIZ_REGISTRY.set(id, { Viz, wrap });
}

register(
  [
    "duplicated-javascript-insight",
    "legacy-javascript-insight",
    "unminified-css",
    "unminified-javascript",
    "unused-css-rules",
  ],
  BytesSavingsViz,
);
register(["total-byte-weight"], TotalByteWeightViz, "mb-4 space-y-3");
register(["unused-javascript"], UnusedJavascriptViz);
register(["third-parties-insight", "third-parties-details"], ThirdPartiesViz, "mb-4 space-y-4");
register(["image-delivery-insight"], ImageDeliveryViz, "");
register(["lcp-breakdown-insight"], AuditLcpPhaseViz);
register(["inp-breakdown-insight"], AuditInpPhaseViz);
register(["bootup-time"], BootupTimeViz);
register(["long-tasks"], LongTasksViz);
register(["main-thread-tasks"], MainThreadTasksViz);
register(["user-timings"], UserTimingsViz);
register(["redirects"], AuditRedirectChain);
register(["cls-culprits-insight", "layout-shifts"], AuditClsCulpritsViz);
register(["dom-size-insight"], DomSizeViz);
register(["network-rtt"], NetworkRttViz);
register(["network-server-latency"], NetworkServerLatencyViz);
register(["resource-summary"], AuditResourceSummaryViz);
register(["network-requests"], AuditNetworkWaterfallViz);
register(SECURITY_SEVERITY_AUDIT_IDS, AuditSeverityFindingsViz);
register(["valid-source-maps"], AuditSourceMapsViz);
register(["server-response-time"], AuditServerResponseTimeViz);
register(["viewport-insight"], AuditViewportViz);
register(IMAGE_ISSUE_AUDIT_IDS, AuditImageIssuesViz);
register(["errors-in-console"], AuditErrorsInConsoleViz, "");
register(["third-party-cookies"], AuditThirdPartyCookiesViz, "");
register(["inspector-issues"], AuditInspectorIssuesViz, "");
register(["deprecations"], AuditDeprecationsViz, "");
register(["js-libraries"], AuditJsLibrariesViz, "");
register(["link-text"], AuditLinkTextViz, "");
register(SEO_PROBLEM_AUDIT_IDS, AuditSeoProblemsViz, "");

export function AuditTableViz({ rows }: { rows: DetailTableItem[] }) {
  const auditId = getAuditId(rows);
  if (!auditId) return null;

  const entry = AUDIT_VIZ_REGISTRY.get(auditId);
  if (entry) {
    const viz = <entry.Viz rows={rows} auditId={auditId} />;
    return entry.wrap ? <div className={entry.wrap}>{viz}</div> : viz;
  }

  return isNodeFindingsAudit(rows, auditId) ? <AuditNodeFindingsViz rows={rows} /> : null;
}
