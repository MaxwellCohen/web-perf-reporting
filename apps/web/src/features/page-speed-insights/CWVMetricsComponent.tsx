import { Card, CardTitle } from "@/components/ui/card";
import { ScoreDisplay } from "@/features/page-speed-insights/ScoreDisplay";
import ReactMarkdown from "react-markdown";
import { HorizontalScoreChart } from "@/components/common/PageSpeedGaugeChart";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import {
  type InsightsContextItem,
  usePageSpeedItems,
} from "@/features/page-speed-insights/PageSpeedContext";
import type { AuditResultsRecord } from "@/lib/schema";

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
      <AccordionTrigger>
        <h3 className="text-lg font-bold">Core Web Vitals Summary</h3>
      </AccordionTrigger>
      <AccordionContent className="-mx-2 grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] items-start gap-2">
        {metricItems.map(({ auditName, title, auditItems, description }) => (
          <Card
            key={auditName}
            className="flex min-w-0 w-full flex-col gap-2 overflow-hidden px-4 py-4"
          >
            <CardTitle className="text-md font-bold">{title}</CardTitle>
            <div className="flex flex-col gap-3 text-sm">
              {auditItems.map(({ audit, label }: MetricAuditEntry) => (
                <div key={`${auditName}_${label}`} className="flex min-w-0 flex-col gap-1">
                  <ScoreDisplay audit={audit} device={label} />
                  <HorizontalScoreChart score={audit.score ?? 0} />
                </div>
              ))}
            </div>
            {description ? (
              <div className="mt-2 text-xs">
                <ReactMarkdown>{description}</ReactMarkdown>
              </div>
            ) : null}
          </Card>
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}
