"use client";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { BootupTimeCard } from "@/features/page-speed-insights/javascript-metrics/BootupTimeCard";
import { MainThreadWorkCard } from "@/features/page-speed-insights/javascript-metrics/MainThreadWorkCard";
import { UnusedJavaScriptCard } from "@/features/page-speed-insights/javascript-metrics/UnusedJavaScriptCard";
import { UnminifiedJavaScriptCard } from "@/features/page-speed-insights/javascript-metrics/UnminifiedJavaScriptCard";
import { LegacyJavaScriptCard } from "@/features/page-speed-insights/javascript-metrics/LegacyJavaScriptCard";
import { JavaScriptSummaryCard } from "@/features/page-speed-insights/javascript-metrics/JavaScriptSummaryCard";
import { TaskSummaryCard } from "@/features/page-speed-insights/javascript-metrics/TaskSummaryCard";
import { useJavaScriptMetrics } from "@/features/page-speed-insights/javascript-metrics/javascriptMetricsSelectors";

export function JavaScriptPerformanceComponent() {
  "use memo";
  const { jsMetrics, jsStats } = useJavaScriptMetrics();

  if (!jsMetrics.length) return null;

  return (
    <AccordionItem value={"javascriptPerformance"}>
      <AccordionSectionTitleTrigger>JavaScript Performance</AccordionSectionTitleTrigger>
      <AccordionContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <JavaScriptSummaryCard stats={jsStats} />
        <TaskSummaryCard
          metrics={jsMetrics.map(({ label, diagnostics, mainThreadTasks }) => ({
            label,
            diagnostics,
            mainThreadTasks,
          }))}
        />
        <BootupTimeCard
          metrics={jsMetrics.map(({ label, bootupTime }) => ({
            label,
            bootupTime,
          }))}
        />
        <MainThreadWorkCard
          metrics={jsMetrics.map(({ label, mainThreadWork }) => ({
            label,
            mainThreadWork,
          }))}
        />
        <UnusedJavaScriptCard
          metrics={jsMetrics.map(({ label, unusedJS }) => ({
            label,
            unusedJS,
          }))}
        />
        <UnminifiedJavaScriptCard
          metrics={jsMetrics.map(({ label, unminifiedJS }) => ({
            label,
            unminifiedJS,
          }))}
        />
        <LegacyJavaScriptCard
          metrics={jsMetrics.map(({ label, legacyJS }) => ({
            label,
            legacyJS,
          }))}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
