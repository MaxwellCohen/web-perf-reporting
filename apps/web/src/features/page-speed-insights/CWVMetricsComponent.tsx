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
import {
  type InsightsContextItem,
  usePageSpeedItems,
} from "@/features/page-speed-insights/PageSpeedContext";
import { CHART_SERIES_COLORS } from "@/features/page-speed-insights/shared/horizontalBarChart";
import { FullWidthRow, SectionGrid } from "@/features/page-speed-insights/shared/MetricsSectionLayout";
import { FcpScreenshotCard } from "@/features/page-speed-insights/FcpScreenshotCard";
import { LcpElementSummary } from "@/features/page-speed-insights/LcpElementSummary";
import { MetricValueViz } from "@/features/page-speed-insights/MetricValueViz";
import { collectFcpScreenshots } from "@/features/page-speed-insights/fcpScreenshot";
import { collectLcpElements } from "@/features/page-speed-insights/lcpElement";
import {
  collectCauseAuditsForMetric,
  METRIC_AUDIT_IDS,
  METRIC_AUDIT_TO_ACRONYM,
  type CauseAuditEntry,
  type MetricAuditId,
  type MetricAuditSource,
} from "@/features/page-speed-insights/metricCauseAudits";
import type { AuditResultsRecord } from "@/lib/schema";

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

type MetricAuditInsight = InsightsContextItem & {
  item: InsightsContextItem["item"] & {
    lighthouseResult: {
      audits: AuditResultsRecord;
      categoryGroups: NonNullable<
        InsightsContextItem["item"]["lighthouseResult"]["categoryGroups"]
      >;
    };
  };
};

function hasMetricAudits(insight: InsightsContextItem): insight is MetricAuditInsight {
  return !!insight.item.lighthouseResult?.audits && !!insight.item.lighthouseResult?.categoryGroups;
}

function collectMetricSources(items: InsightsContextItem[]): MetricAuditSource[] {
  return items.filter(hasMetricAudits).map(({ item, label }) => ({
    audits: item.lighthouseResult.audits,
    label,
  }));
}

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
  const score = audit.score ?? 0;
  const isNumeric = audit.scoreDisplayMode === "numeric" && audit.score !== null;
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
      <HorizontalScoreChart score={score} />
    </div>
  );
}

function MetricSummaryCard({
  metric,
  causes,
  sources,
}: {
  metric: MetricSnapshot;
  causes: CauseAuditEntry[];
  sources: MetricAuditSource[];
}) {
  const { auditId, title, description, auditItems } = metric;
  const measured = auditItems.filter((item) => hasNumericValue(item.audit));
  const unscored = auditItems.filter((item) => !hasNumericValue(item.audit));

  return (
    <Card className="flex h-full min-w-0 w-full flex-col gap-3 overflow-hidden px-4 py-4">
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
        />
      ) : null}
      {unscored.length > 0 ? (
        <div className="flex flex-col gap-3 text-sm">
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
        <div className="mt-auto pt-1 text-xs leading-snug text-muted-foreground [&_p]:my-0">
          <ReactMarkdown>{description}</ReactMarkdown>
        </div>
      ) : null}
    </Card>
  );
}

function CwvMetricsSummary({ sources }: { sources: MetricAuditSource[] }) {
  const metrics = METRIC_AUDIT_IDS.map((auditId) => readMetricSnapshot(auditId, sources));

  return (
    <AccordionItem value="cwv" className="print:border-0">
      <AccordionSectionTitleTrigger>Core Web Vitals Summary</AccordionSectionTitleTrigger>
      <AccordionContent className="-mx-2 grid max-w-full grid-cols-1 items-stretch gap-2 min-[22rem]:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
        {metrics.map((metric) => (
          <MetricSummaryCard
            key={metric.auditId}
            metric={metric}
            causes={collectCauseAuditsForMetric(metric.auditId, sources)}
            sources={sources}
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
  acronym: (typeof METRIC_AUDIT_TO_ACRONYM)[MetricAuditId];
  sources: MetricAuditSource[];
}) {
  if (!causes.length) return null;

  const peakSavings = causes.reduce((max, cause) => Math.max(max, cause.maxSavings), 0);
  const ordered = [...causes].sort((a, b) => b.maxSavings - a.maxSavings);

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card md:col-span-2 lg:col-span-3">
      {ordered.map((cause) => (
        <MetricCauseCard
          key={cause.auditId}
          cause={cause}
          acronym={acronym}
          sources={sources}
          peerMaxSavings={peakSavings}
          plain
        />
      ))}
    </div>
  );
}

function MetricCauseSection({
  auditId,
  sources,
  hasContext = false,
  children,
}: {
  auditId: MetricAuditId;
  sources: MetricAuditSource[];
  /** Unique context (FCP frame, LCP element) exists even when there are no cause audits. */
  hasContext?: boolean;
  children?: ReactNode;
}) {
  const causes = collectCauseAuditsForMetric(auditId, sources);
  const { title, auditItems } = readMetricSnapshot(auditId, sources);
  if (!causes.length && !hasContext) {
    return null;
  }

  const acronym = METRIC_AUDIT_TO_ACRONYM[auditId];

  return (
    <AccordionItem value={`cwv-cause-${auditId}`} className="print:border-0">
      <AccordionSectionTitleTrigger>
        <MetricSectionTriggerLabel title={title} auditItems={auditItems} />
      </AccordionSectionTitleTrigger>
      <AccordionContent>
        <SectionGrid>
          <MetricContextStrip
            auditId={auditId}
            auditItems={auditItems}
            causes={causes}
            sources={sources}
          />
          {children}
          <CauseAuditPanel causes={causes} acronym={acronym} sources={sources} />
        </SectionGrid>
      </AccordionContent>
    </AccordionItem>
  );
}

function FirstContentfulPaintSection({ sources }: { sources: MetricAuditSource[] }) {
  const screenshots = collectFcpScreenshots(sources);

  return (
    <MetricCauseSection
      auditId="first-contentful-paint"
      sources={sources}
      hasContext={screenshots.length > 0}
    >
      <FcpScreenshotCard screenshots={screenshots} />
    </MetricCauseSection>
  );
}

function LargestContentfulPaintSection({ sources }: { sources: MetricAuditSource[] }) {
  const elements = collectLcpElements(sources);

  return (
    <MetricCauseSection
      auditId="largest-contentful-paint"
      sources={sources}
      hasContext={elements.length > 0}
    >
      <LcpElementSummary elements={elements} />
    </MetricCauseSection>
  );
}

function TotalBlockingTimeSection({ sources }: { sources: MetricAuditSource[] }) {
  return <MetricCauseSection auditId="total-blocking-time" sources={sources} />;
}

function CumulativeLayoutShiftSection({ sources }: { sources: MetricAuditSource[] }) {
  return <MetricCauseSection auditId="cumulative-layout-shift" sources={sources} />;
}

function SpeedIndexSection({ sources }: { sources: MetricAuditSource[] }) {
  return <MetricCauseSection auditId="speed-index" sources={sources} />;
}

export function CWVMetricsComponent() {
  const sources = collectMetricSources(usePageSpeedItems());

  if (!sources.length) {
    return null;
  }

  return (
    <>
      <CwvMetricsSummary sources={sources} />
      <FirstContentfulPaintSection sources={sources} />
      <LargestContentfulPaintSection sources={sources} />
      <TotalBlockingTimeSection sources={sources} />
      <CumulativeLayoutShiftSection sources={sources} />
      <SpeedIndexSection sources={sources} />
    </>
  );
}
