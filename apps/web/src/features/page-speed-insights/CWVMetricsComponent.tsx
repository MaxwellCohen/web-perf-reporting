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

const metricAuditRefId = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
] as const;

type MetricAuditId = (typeof metricAuditRefId)[number];

type MetricAuditSource = {
  audits: AuditResultsRecord;
  label: string;
};

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

  const metricItems = metricAuditRefId.map((auditName) => createMetricCard(auditName, sources));

  if (!metricItems.length) {
    return null;
  }

  return (
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
