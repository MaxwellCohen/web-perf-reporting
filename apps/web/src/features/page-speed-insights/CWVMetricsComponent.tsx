"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import { AccordionItem, AccordionContent } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { HorizontalScoreChart } from "@/components/common/PageSpeedGaugeChart";
import { Card, CardTitle } from "@/components/ui/card";
import { ScoreDisplay } from "@/features/page-speed-insights/ScoreDisplay";
import { DashboardPanelFallback } from "@/features/page-speed-insights/dashboard-view/DashboardPanelFallback";
import { CHART_SERIES_COLORS } from "@/features/page-speed-insights/shared/horizontalBarChart";
import {
  FullWidthRow,
  SectionGrid,
} from "@/features/page-speed-insights/shared/MetricsSectionLayout";
import { FieldVsLabExplainer } from "@/features/page-speed-insights/FieldVsLabExplainer";
import { FcpScreenshotCard } from "@/features/page-speed-insights/FcpScreenshotCard";
import { LcpElementSummary } from "@/features/page-speed-insights/LcpElementSummary";
import {
  MetricValueViz,
  SUMMARY_ROWS_PER_RUN,
} from "@/features/page-speed-insights/MetricValueViz";
import { collectFcpScreenshots } from "@/features/page-speed-insights/fcpScreenshot";
import { collectLcpElements } from "@/features/page-speed-insights/lcpElement";
import {
  collectCauseAuditsForMetric,
  METRIC_AUDIT_IDS,
  type CauseAuditEntry,
  type CwvMetricAcronym,
  type MetricAuditId,
  type MetricAuditSource,
} from "@/features/page-speed-insights/metricCauseAudits";
import {
  causeKey,
  metricSectionId,
  metricSectionKey,
  type OverviewMetric,
} from "@/features/page-speed-insights/dashboard-view/overview/overviewModel";
import { useOverviewOpen } from "@/features/page-speed-insights/dashboard-view/overview/overviewOpen";
import { useOverviewModel } from "@/features/page-speed-insights/dashboard-view/overview/useOverviewModel";
import type { AuditResultsRecord } from "@/lib/schema";
import { cn } from "@/lib/utils";

const MetricCauseCard = dynamic(
  () => import("@/features/page-speed-insights/MetricCauseCard").then((mod) => mod.MetricCauseCard),
  { loading: () => <DashboardPanelFallback label="audit details" /> },
);

type MetricAuditEntry = {
  audit: AuditResultsRecord[string];
  label: string;
};

type MetricSnapshot = {
  auditId: MetricAuditId;
  title?: string;
  description?: string;
  auditItems: MetricAuditEntry[];
};

function readMetricSnapshot(auditId: MetricAuditId, sources: MetricAuditSource[]): MetricSnapshot {
  const auditItems: MetricAuditEntry[] = sources.flatMap(({ audits, label }) => {
    const audit = audits[auditId];
    return audit ? [{ audit, label }] : [];
  });

  const primary = auditItems[0]?.audit;

  return {
    auditId,
    title: primary?.title,
    description: primary?.description,
    auditItems,
  };
}

function MetricSectionTriggerLabel({
  title,
  auditItems,
}: {
  title?: string;
  auditItems: MetricAuditEntry[];
}) {
  const displayParts = auditItems
    .filter((item) => item.audit.displayValue)
    .map(({ audit, label }) =>
      auditItems.length > 1 ? `${label}: ${audit.displayValue}` : audit.displayValue,
    );

  return (
    <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-3">
      <span>{title}</span>
      {displayParts.length > 0 ? (
        <span className="text-sm font-normal text-muted-foreground tabular-nums">
          {displayParts.join(" · ")}
        </span>
      ) : null}
    </span>
  );
}

function MetricAuditRow({
  audit,
  label,
  index,
  showSwatch,
}: {
  audit: MetricAuditEntry["audit"];
  label: string;
  index: number;
  showSwatch: boolean;
}) {
  const score = audit.score;
  const isNumeric = audit.scoreDisplayMode === "numeric" && score != null;
  const swatch = CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length];

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {isNumeric ? (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
              {showSwatch ? (
                <span
                  className="size-2 shrink-0 rounded-xs"
                  style={{ backgroundColor: swatch }}
                  aria-hidden
                />
              ) : null}
              <span className="truncate">{label}</span>
            </span>
            {audit.displayValue ? (
              <span className="shrink-0 font-mono text-sm font-medium tabular-nums">
                {audit.displayValue}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            Score: {Math.round(score * 100)} / 100
          </div>
        </>
      ) : (
        <ScoreDisplay audit={audit} device={label} />
      )}
      {score != null ? <HorizontalScoreChart score={score} /> : null}
    </div>
  );
}

function MetricSummaryCard({
  metric,
  causes,
  sources,
  rowSpan,
}: {
  metric: MetricSnapshot;
  causes: CauseAuditEntry[];
  sources: MetricAuditSource[];
  /** Rows this card spans in the summary grid; shared by every card so their parts align. */
  rowSpan: number;
}) {
  const { auditId, title, description, auditItems } = metric;
  const measured = auditItems.filter((item) => hasNumericValue(item.audit));
  const unscored = auditItems.filter((item) => !hasNumericValue(item.audit));

  return (
    <Card
      className="mb-2 grid min-w-0 w-full grid-rows-subgrid gap-y-0 overflow-hidden px-4 py-4"
      style={{ gridRow: `span ${rowSpan}` }}
    >
      <CardTitle className="text-md min-w-0 leading-snug font-bold wrap-break-word">
        {title}
      </CardTitle>
      {measured.length > 0 ? (
        <MetricValueViz
          auditId={auditId}
          auditItems={measured}
          causes={causes}
          sources={sources}
          detail={false}
          subgrid
        />
      ) : null}
      {unscored.length > 0 ? (
        <div className="flex flex-col gap-3 pt-3 text-sm [grid-row:-3]">
          {unscored.map(({ audit, label }, index) => (
            <MetricAuditRow
              key={`${auditId}_${label}`}
              audit={audit}
              label={label}
              index={index}
              showSwatch={auditItems.length > 1}
            />
          ))}
        </div>
      ) : null}
      {description ? (
        <div className="self-end pt-4 text-xs leading-snug text-muted-foreground [grid-row:-2] [&_p]:my-0">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      ) : null}
    </Card>
  );
}

function CwvMetricsSummary({ sources }: { sources: MetricAuditSource[] }) {
  const metrics = METRIC_AUDIT_IDS.map((auditId) => readMetricSnapshot(auditId, sources));
  const maxRuns = Math.max(
    0,
    ...metrics.map(
      (metric) => metric.auditItems.filter((item) => hasNumericValue(item.audit)).length,
    ),
  );
  // Title, each run's parts, compare deltas, unscored audits, description.
  const rowSpan = 1 + maxRuns * SUMMARY_ROWS_PER_RUN + 3;

  return (
    <AccordionItem value="cwv" className="print:border-0">
      <AccordionSectionTitleTrigger>Core Web Vitals Summary</AccordionSectionTitleTrigger>
      {/* Cards subgrid these rows, so row gaps live on the cards (`mb-2`) to keep empty rows flat. */}
      <AccordionContent className="-mx-2 grid max-w-full grid-cols-1 gap-x-2 gap-y-0 min-[22rem]:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
        <FieldVsLabExplainer />
        {metrics.map((metric) => (
          <MetricSummaryCard
            key={metric.auditId}
            metric={metric}
            causes={collectCauseAuditsForMetric(metric.auditId, sources)}
            sources={sources}
            rowSpan={rowSpan}
          />
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}

function hasNumericValue(audit: MetricAuditEntry["audit"]): boolean {
  return audit.numericValue != null && Number.isFinite(audit.numericValue);
}

function MetricContextStrip({
  auditId,
  auditItems,
  causes,
  sources,
}: {
  auditId: MetricAuditId;
  auditItems: MetricAuditEntry[];
  causes: CauseAuditEntry[];
  sources: MetricAuditSource[];
}) {
  if (!auditItems.length) return null;

  const measured = auditItems.filter((item) => hasNumericValue(item.audit));
  const unscored = auditItems.filter((item) => !hasNumericValue(item.audit));

  return (
    <FullWidthRow>
      <div className="flex flex-col gap-4">
        {measured.length > 0 ? (
          <MetricValueViz
            auditId={auditId}
            auditItems={measured}
            causes={causes}
            sources={sources}
          />
        ) : null}
        {unscored.length > 0 ? (
          <div className="flex flex-col gap-3 text-sm">
            {unscored.map(({ audit, label }, index) => (
              <MetricAuditRow
                key={label}
                audit={audit}
                label={label}
                index={index}
                showSwatch={auditItems.length > 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    </FullWidthRow>
  );
}

function CauseAuditPanel({
  causes,
  acronym,
  sources,
}: {
  causes: CauseAuditEntry[];
  acronym: CwvMetricAcronym;
  sources: MetricAuditSource[];
}) {
  const open = useOverviewOpen();
  if (!causes.length) return null;

  const peakSavings = causes.reduce((max, cause) => Math.max(max, cause.maxSavings), 0);

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card md:col-span-2 lg:col-span-3">
      {causes.map((cause) => {
        const key = causeKey(cause.auditId);
        return (
          <div
            key={cause.auditId}
            id={key}
            className={cn(
              "scroll-mt-20",
              open?.highlighted === key && "ring-2 ring-foreground ring-inset",
            )}
          >
            <MetricCauseCard
              cause={cause}
              acronym={acronym}
              sources={sources}
              peerMaxSavings={peakSavings}
              plain
              // Outside the Overview the card keeps its own open state.
              open={open?.isOpen(key)}
              onOpenChange={open ? (next) => open.setOpen(key, next) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}

/** Causes this metric shares with an earlier one: a link to the full card, not a second copy. */
function SharedCauseLinks({
  refs,
  metrics,
}: {
  refs: OverviewMetric["refs"];
  metrics: OverviewMetric[];
}) {
  const open = useOverviewOpen();
  if (!refs.length) return null;

  return (
    <ul className="flex flex-col gap-2 md:col-span-2 lg:col-span-3">
      {refs.map(({ cause, home }) => {
        const homeAcronym = metrics.find((metric) => metric.metricId === home)?.acronym;
        const text = (
          <>
            <span className="font-semibold">{cause.title}</span>
            <span className="text-muted-foreground"> · detailed under {homeAcronym}</span>
          </>
        );
        const className = "block min-h-11 w-full rounded-lg border border-dashed px-4 py-2.5";
        return (
          <li key={cause.auditId} className="text-sm">
            {open ? (
              <button
                type="button"
                className={cn(className, "text-left hover:bg-muted")}
                onClick={() =>
                  open.reveal(
                    [metricSectionKey(home), causeKey(cause.auditId)],
                    causeKey(cause.auditId),
                  )
                }
              >
                {text}
              </button>
            ) : (
              <div className={className}>{text}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MetricCauseSection({
  metric,
  metrics,
  sources,
  children,
}: {
  metric: OverviewMetric;
  metrics: OverviewMetric[];
  sources: MetricAuditSource[];
  /** Context unique to the metric: the FCP frame, the LCP element. */
  children?: ReactNode;
}) {
  const { metricId, causes } = metric;
  const { title, auditItems } = readMetricSnapshot(metricId, sources);
  if (!metric.hasSection) return null;

  return (
    <AccordionItem
      id={metricSectionId(metricId)}
      value={metricSectionKey(metricId)}
      className="scroll-mt-20 print:border-0"
    >
      <AccordionSectionTitleTrigger>
        <MetricSectionTriggerLabel title={title} auditItems={auditItems} />
      </AccordionSectionTitleTrigger>
      <AccordionContent>
        <SectionGrid>
          <MetricContextStrip
            auditId={metricId}
            auditItems={auditItems}
            causes={causes}
            sources={sources}
          />
          {children}
          <CauseAuditPanel causes={metric.own} acronym={metric.acronym} sources={sources} />
          <SharedCauseLinks refs={metric.refs} metrics={metrics} />
        </SectionGrid>
      </AccordionContent>
    </AccordionItem>
  );
}

function metricContext(metricId: MetricAuditId, sources: MetricAuditSource[]): ReactNode {
  if (metricId === "first-contentful-paint") {
    return <FcpScreenshotCard screenshots={collectFcpScreenshots(sources)} />;
  }
  if (metricId === "largest-contentful-paint") {
    return <LcpElementSummary elements={collectLcpElements(sources)} />;
  }
  return null;
}

/** The causes behind each metric, then the Core Web Vitals summary cards. */
export function CWVMetricsComponent() {
  const { sources, model } = useOverviewModel();

  if (!sources.length) {
    return null;
  }

  return (
    <>
      {model.metrics.map((metric) => (
        <MetricCauseSection
          key={metric.metricId}
          metric={metric}
          metrics={model.metrics}
          sources={sources}
        >
          {metricContext(metric.metricId, sources)}
        </MetricCauseSection>
      ))}
      <CwvMetricsSummary sources={sources} />
    </>
  );
}
