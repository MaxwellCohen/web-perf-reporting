"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
} from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { BootupTimeCard } from "@/features/page-speed-insights/javascript-metrics/BootupTimeCard";
import { BootupTimeChartCard } from "@/features/page-speed-insights/javascript-metrics/BootupTimeChartCard";
import { MainThreadWorkCard } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkCard";
import { MainThreadWorkChartCard } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkChartCard";
import { UnusedJavaScriptCard } from "@/features/page-speed-insights/javascript-metrics/UnusedJavaScriptCard";
import { UnminifiedJavaScriptCard } from "@/features/page-speed-insights/javascript-metrics/UnminifiedJavaScriptCard";
import { LegacyJavaScriptCard } from "@/features/page-speed-insights/javascript-metrics/LegacyJavaScriptCard";
import { JavaScriptSummaryCard } from "@/features/page-speed-insights/javascript-metrics/JavaScriptSummaryCard";
import { JavaScriptSummaryChartCard } from "@/features/page-speed-insights/javascript-metrics/JavaScriptSummaryChartCard";
import { TaskSummaryCard } from "@/features/page-speed-insights/javascript-metrics/TaskSummaryCard";
import { TaskThresholdChartCard } from "@/features/page-speed-insights/javascript-metrics/TaskThresholdChartCard";
import { useJavaScriptMetrics } from "@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors";
import {
  ChartTableStack,
  FullWidthRow,
  SectionGrid,
} from "@/features/page-speed-insights/shared/MetricsSectionLayout";

export function JavaScriptPerformanceComponent() {
  "use memo";
  const { jsMetrics, jsStats } = useJavaScriptMetrics();

  if (!jsMetrics.length) return null;

  const taskMetrics = jsMetrics.map(({ label, diagnostics, mainThreadTasks }) => ({
    label,
    diagnostics,
    mainThreadTasks,
  }));
  const bootupMetrics = jsMetrics.map(({ label, bootupTime }) => ({ label, bootupTime }));
  const mainThreadMetrics = jsMetrics.map(({ label, mainThreadWork }) => ({
    label,
    mainThreadWork,
  }));
  const unusedMetrics = jsMetrics.map(({ label, unusedJS }) => ({ label, unusedJS }));
  const unminifiedMetrics = jsMetrics.map(({ label, unminifiedJS }) => ({ label, unminifiedJS }));
  const legacyMetrics = jsMetrics.map(({ label, legacyJS }) => ({ label, legacyJS }));

  const hasOptimizationAudits =
    unusedMetrics.some((m) => m.unusedJS.length > 0) ||
    unminifiedMetrics.some((m) => m.unminifiedJS.length > 0) ||
    legacyMetrics.some((m) => m.legacyJS.length > 0);

  return (
    <AccordionItem value={"javascriptPerformance"}>
      <AccordionSectionTitleTrigger>JavaScript &amp; Main Thread</AccordionSectionTitleTrigger>
      <AccordionContent>
        <SectionGrid>
          <JavaScriptSummaryCard stats={jsStats} />
          <JavaScriptSummaryChartCard stats={jsStats} />

          <FullWidthRow>
            <ChartTableStack>
              <TaskThresholdChartCard metrics={taskMetrics} />
              <TaskSummaryCard metrics={taskMetrics} />
            </ChartTableStack>
          </FullWidthRow>

          <FullWidthRow>
            <ChartTableStack>
              <MainThreadWorkChartCard metrics={mainThreadMetrics} />
              <MainThreadWorkCard metrics={mainThreadMetrics} />
            </ChartTableStack>
          </FullWidthRow>

          <FullWidthRow>
            <ChartTableStack>
              <BootupTimeChartCard metrics={bootupMetrics} />
              <BootupTimeCard metrics={bootupMetrics} />
            </ChartTableStack>
          </FullWidthRow>

          {hasOptimizationAudits ? (
            <FullWidthRow>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="scriptOptimizationAudits">
                  <AccordionSectionTitleTrigger>
                    Script Optimization Audits
                  </AccordionSectionTitleTrigger>
                  <AccordionContent>
                    <SectionGrid>
                      <UnusedJavaScriptCard metrics={unusedMetrics} />
                      <UnminifiedJavaScriptCard metrics={unminifiedMetrics} />
                      <LegacyJavaScriptCard metrics={legacyMetrics} />
                    </SectionGrid>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </FullWidthRow>
          ) : null}
        </SectionGrid>
      </AccordionContent>
    </AccordionItem>
  );
}
