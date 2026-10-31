"use client";

import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { RenderDetails } from "@/features/page-speed-insights/lh-categories/RenderDetails";
import type {
  CauseAuditEntry,
  CwvMetricAcronym,
  MetricAuditSource,
} from "@/features/page-speed-insights/metricCauseAudits";
import type { TableDataItem } from "@/features/page-speed-insights/tsTable/TableDataItem";
import { recommendationMarkdownComponents } from "@/features/page-speed-insights/RecommendationsSection/recommendationMarkdownComponents";
import { ImageDeliveryCause } from "@/features/page-speed-insights/ImageDeliveryCause";
import { MainThreadTasksCause } from "@/features/page-speed-insights/MainThreadTasksCause";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";
import { cn } from "@/lib/utils";

const descriptionMarkdownComponents = recommendationMarkdownComponents();

function formatSavings(acronym: CwvMetricAcronym, value: number): string | null {
  if (!(value > 0)) return null;
  if (acronym === "CLS") {
    return `Est. savings: ${value.toFixed(3)} CLS`;
  }
  return `Est. savings: ${Math.round(value)} ms ${acronym}`;
}

function toTableDataItems(cause: CauseAuditEntry): TableDataItem[] {
  return cause.entries.map(({ audit, label }) => ({
    _category: {},
    _userLabel: label,
    auditRef: { id: cause.auditId },
    auditResult: audit,
  }));
}

function CauseBody({ cause, sources }: { cause: CauseAuditEntry; sources: MetricAuditSource[] }) {
  const isMainThreadTasks = cause.auditId === "main-thread-tasks";
  const isImageDelivery = cause.auditId === "image-delivery-insight";
  const items = toTableDataItems(cause);

  return (
    <div className="space-y-3">
      {!isMainThreadTasks && cause.description ? (
        <div className="text-sm text-muted-foreground">
          <ReactMarkdown components={descriptionMarkdownComponents}>
            {cause.description}
          </ReactMarkdown>
        </div>
      ) : null}
      {isMainThreadTasks ? (
        <MainThreadTasksCause entries={cause.entries} sources={sources} />
      ) : isImageDelivery ? (
        <ImageDeliveryCause entries={cause.entries} />
      ) : (
        <RenderDetails items={items} embedded />
      )}
      <RenderJSONDetails
        className="text-right"
        data={cause.entries[0]?.audit}
        data2={cause.entries[1]?.audit}
        title={`All Data for ${cause.auditId}`}
      />
    </div>
  );
}

export function MetricCauseCard({
  cause,
  acronym,
  sources = [],
  peerMaxSavings = 0,
  plain = false,
}: {
  cause: CauseAuditEntry;
  acronym: CwvMetricAcronym;
  sources?: MetricAuditSource[];
  /** Largest savings among sibling causes, so bars in one section share a scale. */
  peerMaxSavings?: number;
  /** Row inside the related-audits panel, without its own card chrome. */
  plain?: boolean;
}) {
  const isMainThreadTasks = cause.auditId === "main-thread-tasks";
  const title = isMainThreadTasks ? "Main-thread tasks" : cause.title;
  const savingsLabel = formatSavings(acronym, cause.maxSavings);
  const barPct =
    savingsLabel && peerMaxSavings > 0
      ? Math.min(100, (cause.maxSavings / peerMaxSavings) * 100)
      : null;

  const header = (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        {plain ? (
          <h4 className="min-w-0 text-base font-semibold leading-snug">{title}</h4>
        ) : (
          <CardTitle className="min-w-0 text-base leading-snug">{title}</CardTitle>
        )}
        {savingsLabel ? (
          <span className="shrink-0 font-mono text-xs font-medium tabular-nums">
            {savingsLabel}
          </span>
        ) : null}
      </div>
      {barPct != null ? (
        <div className="h-1.5 overflow-hidden rounded-sm bg-muted" aria-hidden>
          <div className="h-full bg-foreground/80" style={{ width: `${barPct}%` }} />
        </div>
      ) : null}
    </div>
  );

  const body = <CauseBody cause={cause} sources={sources} />;
  const summaryClassName =
    "cursor-pointer list-none marker:content-none [&::-webkit-details-marker]:hidden";

  if (plain) {
    return (
      <details className="group px-4 py-4">
        <summary className={summaryClassName}>{header}</summary>
        <div className="pt-3">{body}</div>
      </details>
    );
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3 shadow-none">
      <details className="group">
        <summary className={cn(summaryClassName, "space-y-0 p-4")}>{header}</summary>
        <CardContent className="p-4 pt-0">{body}</CardContent>
      </details>
    </Card>
  );
}
