import { AccordionItem, AccordionContent } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { ScoreDisplay } from "@/features/page-speed-insights/ScoreDisplay";
import ReactMarkdown from "react-markdown";
import { HorizontalScoreChart } from "@/components/common/PageSpeedGaugeChart";
import {
  type InsightsContextItem,
  usePageSpeedItems,
} from "@/features/page-speed-insights/PageSpeedContext";
import type { AuditResultsRecord } from "@/lib/schema";
import { Card, CardTitle } from "@/components/ui/card";
import { CHART_SERIES_COLORS } from "@/features/page-speed-insights/shared/horizontalBarChart";
import { SectionGrid } from "@/features/page-speed-insights/shared/MetricsSectionLayout";
import { FcpScreenshotCard } from "@/features/page-speed-insights/FcpScreenshotCard";
import { LcpElementSummary } from "@/features/page-speed-insights/LcpElementSummary";
import { MetricCauseCard } from "@/features/page-speed-insights/MetricCauseCard";
import { collectFcpScreenshots } from "@/features/page-speed-insights/fcpScreenshot";
import { collectLcpElements } from "@/features/page-speed-insights/lcpElement";
import {
  collectCauseAuditsForMetric,
  METRIC_AUDIT_IDS,
  METRIC_AUDIT_TO_ACRONYM,
  type MetricAuditId,
  type MetricAuditSource,
} from "@/features/page-speed-insights/metricCauseAudits";

type MetricAuditEntry = {
  audit: AuditResultsRecord[string];
  label: string;
};

type MetricCard = {
  auditName: MetricAuditId;
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

function createMetricCard(auditName: MetricAuditId, sources: MetricAuditSource[]): MetricCard {
  const auditItems: MetricAuditEntry[] = sources.flatMap(({ audits, label }) => {
    const audit = audits[auditName];

    return audit ? [{ audit, label }] : [];
  });

  const primaryAudit = auditItems[0]?.audit;

  return {
    auditName,
    title: primaryAudit?.title,
    description: primaryAudit?.description,
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

export function CWVMetricsComponent() {
  const items = usePageSpeedItems();

  const sources: MetricAuditSource[] = items
    .filter(hasMetricAudits)
    .map(({ item, label }: MetricAuditInsight) => ({
      audits: item.lighthouseResult.audits,
      label,
    }));

  if (!sources.length) {
    return null;
  }

  const metricItems = METRIC_AUDIT_IDS.map((auditName) => createMetricCard(auditName, sources));

  if (!metricItems.length) {
    return null;
  }

  return (
    <>
      <AccordionItem value="cwv" className="print:border-0">
        <AccordionSectionTitleTrigger>Core Web Vitals Summary</AccordionSectionTitleTrigger>
        <AccordionContent className="-mx-2 grid grid-cols-1 items-stretch gap-2 min-[22rem]:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))]">
          {metricItems.map(({ auditName, title, auditItems, description }) => (
            <Card
              key={auditName}
              className="flex h-full min-w-0 w-full flex-col gap-2 overflow-hidden px-4 py-4"
            >
              <CardTitle className="text-md min-w-0 font-bold wrap-break-word">{title}</CardTitle>
              <div className="flex flex-col gap-3 text-sm">
                {auditItems.map(({ audit, label }, index) => (
                  <MetricAuditRow
                    key={`${auditName}_${label}`}
                    audit={audit}
                    label={label}
                    index={index}
                    showSwatch={auditItems.length > 1}
                  />
                ))}
              </div>
              {description ? (
                <div className="mt-auto pt-2 text-xs text-muted-foreground">
                  <ReactMarkdown>{description}</ReactMarkdown>
                </div>
              ) : null}
            </Card>
          ))}
        </AccordionContent>
      </AccordionItem>

      {metricItems.map(({ auditName, title, auditItems }) => {
        const causes = collectCauseAuditsForMetric(auditName, sources);
        if (!causes.length) {
          return null;
        }

        const acronym = METRIC_AUDIT_TO_ACRONYM[auditName];

        return (
          <AccordionItem key={auditName} value={`cwv-cause-${auditName}`} className="print:border-0">
            <AccordionSectionTitleTrigger>
              <MetricSectionTriggerLabel title={title} auditItems={auditItems} />
            </AccordionSectionTitleTrigger>
            <AccordionContent>
              <SectionGrid>
                {auditName === "first-contentful-paint" ? (
                  <FcpScreenshotCard screenshots={collectFcpScreenshots(sources)} />
                ) : null}
                {auditName === "largest-contentful-paint" ? (
                  <LcpElementSummary elements={collectLcpElements(sources)} />
                ) : null}
                {causes.map((cause) => (
                  <MetricCauseCard
                    key={cause.auditId}
                    cause={cause}
                    acronym={acronym}
                    sources={sources}
                  />
                ))}
              </SectionGrid>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </>
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
