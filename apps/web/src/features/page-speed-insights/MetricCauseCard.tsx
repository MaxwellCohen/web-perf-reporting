"use client";

import ReactMarkdown from "react-markdown";
import { Accordion } from "@/components/ui/accordion";
import { TableCardShell } from "@/features/page-speed-insights/shared/TableCard";
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

export function MetricCauseCard({
  cause,
  acronym,
  sources = [],
}: {
  cause: CauseAuditEntry;
  acronym: CwvMetricAcronym;
  sources?: MetricAuditSource[];
}) {
  const isMainThreadTasks = cause.auditId === "main-thread-tasks";
  const isImageDelivery = cause.auditId === "image-delivery-insight";
  const items = toTableDataItems(cause);
  const savingsLabel = formatSavings(acronym, cause.maxSavings);

  return (
    <TableCardShell
      title={isMainThreadTasks ? "Main-thread tasks" : cause.title}
      className="md:col-span-2 lg:col-span-3"
    >
      <div className="space-y-3">
        {isMainThreadTasks ? (
          <MainThreadTasksCause entries={cause.entries} sources={sources} />
        ) : (
          <>
            {savingsLabel ? (
              <p className="text-sm font-medium text-muted-foreground">{savingsLabel}</p>
            ) : null}
            {cause.description ? (
              <div className="text-sm text-muted-foreground">
                <ReactMarkdown components={descriptionMarkdownComponents}>
                  {cause.description}
                </ReactMarkdown>
              </div>
            ) : null}
            {isImageDelivery ? (
              <ImageDeliveryCause entries={cause.entries} />
            ) : (
              <Accordion type="multiple" className="w-full">
                <RenderDetails items={items} />
              </Accordion>
            )}
          </>
        )}
      </div>
    </TableCardShell>
  );
}
