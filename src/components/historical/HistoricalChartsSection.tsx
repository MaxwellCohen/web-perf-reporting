/* eslint-disable @next/next/no-img-element */
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  getHistoricalCruxData,
  formFactor,
} from '@/lib/services';
import { formatCruxReport, formatFormFactor, groupBy } from '@/lib/utils';

import { HistoricalPerformanceCard } from '@/components/historical/HistoricalPerformanceCard';

export async function HistoricalChartsSection({
  url,
  formFactor,
  origin,
}: {
  url?: string;
  formFactor?: formFactor;
  origin?: string;
}) {
  const reports = await getHistoricalCruxData({
    url,
    formFactor,
    origin,
  });

  if (!reports?.length) {
    return null;
  }
  const currentCruxHistoricalResult = reports
    .map((report) => formatCruxReport(report))
    .flatMap((i) => i)
    .filter((i) => !!i);
  const groupedMetics = groupBy(
    currentCruxHistoricalResult,
    ({ metric_name }) => metric_name || '',
  );

  return (
    <AccordionItem value={`historical-${formFactor}-${url}-${origin}`}>
      <AccordionTrigger>
        Historical Performance Report For {formatFormFactor(formFactor)} Devices{' '}
        {url ? `for the page` : 'for the origin'}
      </AccordionTrigger>
      <AccordionContent>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          <HistoricalPerformanceCard
            title="Cumulative Layout Shift"
            histogramData={groupedMetics.cumulative_layout_shift || []}
          />
          <HistoricalPerformanceCard
            title="Experimental Time to First Byte"
            histogramData={groupedMetics.experimental_time_to_first_byte || []}
          />
          <HistoricalPerformanceCard
            title="Interaction to Next Paint"
            histogramData={groupedMetics.interaction_to_next_paint || []}
          />
          <HistoricalPerformanceCard
            title="Largest Contentful Paint"
            histogramData={groupedMetics.largest_contentful_paint || []}
          />
          <HistoricalPerformanceCard
            title="Round Trip Time"
            histogramData={groupedMetics.round_trip_time || []}
          />
          <HistoricalPerformanceCard
            title="First Contentful Paint"
            histogramData={groupedMetics.first_contentful_paint || []}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}



