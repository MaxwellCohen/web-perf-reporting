'use client';
import { useContext } from 'react';
import { InsightsContext } from '@/components/page-speed/PageSpeedContext';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BootupTimeCard } from '@/components/page-speed/javascript-metrics/BootupTimeCard';
import { MainThreadWorkCard } from '@/components/page-speed/javascript-metrics/MainThreadWorkCard';
import { UnusedJavaScriptCard } from '@/components/page-speed/javascript-metrics/UnusedJavaScriptCard';
import { UnminifiedJavaScriptCard } from '@/components/page-speed/javascript-metrics/UnminifiedJavaScriptCard';
import { LegacyJavaScriptCard } from '@/components/page-speed/javascript-metrics/LegacyJavaScriptCard';
import { JavaScriptSummaryCard } from '@/components/page-speed/javascript-metrics/JavaScriptSummaryCard';
import { TaskSummaryCard } from '@/components/page-speed/javascript-metrics/TaskSummaryCard';
import { extractJSMetrics } from '@/components/page-speed/javascript-metrics/extractJSMetrics';

export function JavaScriptPerformanceComponent() {
  'use memo';
  const items = useContext(InsightsContext);

  const jsMetrics = items.map(extractJSMetrics);

  if (!items.length) {
    return null;
  }

  // Calculate JavaScript statistics
  const jsStats = jsMetrics.map(({ jsResources, label }) => {
    if (!jsResources.length) {
      return {
        label,
        totalScripts: 0,
        totalTransferSize: 0,
        totalResourceSize: 0,
      };
    }

    const totalScripts = jsResources.length;
    const { totalTransferSize, totalResourceSize } = jsResources.reduce(
      (acc: { totalTransferSize: number; totalResourceSize: number }, curr) => {
        const transferSize = +(curr?.transferSize || 0) || 0;
        const resourceSize = +(curr?.resourceSize || 0) || 0;
        return {
          totalTransferSize: acc.totalTransferSize + transferSize,
          totalResourceSize: acc.totalResourceSize + resourceSize,
        };
      },
      {
        totalTransferSize: 0,
        totalResourceSize: 0,
      },
    );

    return {
      label,
      totalScripts,
      totalTransferSize,
      totalResourceSize,
    };
  });

  return (
    <AccordionItem value={'javascriptPerformance'}>
      <AccordionTrigger className="text-lg font-bold group-hover:underline">
        JavaScript Performance
      </AccordionTrigger>
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
