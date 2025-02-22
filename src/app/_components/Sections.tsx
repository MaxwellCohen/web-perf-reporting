import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  getHistoricalCruxData,
  getCurrentCruxData,
  requestPageSpeedData,
} from '@/lib/services';
import { formatCruxReport, formatFormFactor } from '@/lib/utils';
import { CurrentPerformanceCard } from './CurrentPerformanceCard';
import { HistoricalPerformanceCard } from './HistoricalPerformanceCard';
import GaugeChart from './PageSpeedGuageChart';
import { formFactor } from '@/lib/services';

function groupBy<T>(list: T[], keyGetter: (item: T) => string) {
  const map = new Map<string, T[]>();
  list.forEach((item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  });
  return Object.fromEntries(map.entries());
}

export async function ChartsHistoricalSection({
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

  const currentCruxHistoricalResult = reports.map((report) => formatCruxReport(report, formFactor)).flatMap(i => i).filter(i => !!i)
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

export async function CurrentPerformanceCharts({
  url,
  formFactor,
  origin,
}: {
  url?: string;
  origin?: string;
  formFactor?: formFactor;
}) {
  const report = await getCurrentCruxData({ url, formFactor, origin });
  if(!report) {
    return null;
  }

  const data = formatCruxReport(report, formFactor)
  if (!data) {
    return null;
  }
  const groupedMetics = groupBy(data , ({ metric_name }) => metric_name || '');
  const form_factors = report?.record?.metrics?.form_factors?.fractions
  return (
    <AccordionItem value={`current-${formFactor}`}>
      <AccordionTrigger>
        <h2 className="text-xl">
          Latest Performance Report For {formatFormFactor(formFactor)} Devices{' '}
          {url ? `for the page` : 'for the origin'}
        </h2>
      </AccordionTrigger>
      <AccordionContent>
        <h3>{`Date Range: ${groupedMetics?.cumulative_layout_shift?.[0].start_date} - ${groupedMetics?.cumulative_layout_shift?.[0].end_date}`}</h3>
        {form_factors ?  <div><strong>Desktop</strong> {form_factors.desktop * 100} %  <strong>Phone</strong> {form_factors.phone * 100} % <strong>tablet</strong> {form_factors.tablet * 100} %</div> : null }
        <div className="mt-2 grid gap-1 md:grid-cols-3 lg:grid-cols-6">
          <CurrentPerformanceCard
            title="Largest Contentful Paint (LCP)"
            histogramData={groupedMetics?.largest_contentful_paint?.[0]}
          />
          <CurrentPerformanceCard
            title="Interaction to Next Paint (INP)"
            histogramData={groupedMetics?.interaction_to_next_paint?.[0]}
          />
          <CurrentPerformanceCard
            title="Cumulative Layout Shift (CLS)"
            histogramData={groupedMetics?.cumulative_layout_shift?.[0]}
          />
          <CurrentPerformanceCard
            title="First Contentful Paint (FCP)"
            histogramData={groupedMetics?.first_contentful_paint?.[0]}
          />
          <CurrentPerformanceCard
            title="Time to First Byte (TTFB)"
            histogramData={groupedMetics?.experimental_time_to_first_byte?.[0]}
          />
          <CurrentPerformanceCard
            title="Round Trip Time (RTT)"
            histogramData={groupedMetics?.round_trip_time?.[0]}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export async function PageSpeedInsights({
  url,
  formFactor,
}: {
  url: string;
  formFactor: formFactor;
}) {
  const data = await requestPageSpeedData(url, formFactor);
  return (
    <AccordionItem value={`PageSpeed-${formFactor}-${url}-${origin}`}>
      <AccordionTrigger>
        Page speed Insights For {formatFormFactor(formFactor)} Devices
      </AccordionTrigger>
      <AccordionContent>
        <h3 className="text-xl">
          Page Loading Experience :{' '}
          <strong>{data?.loadingExperience.overall_category}</strong>
        </h3>
        <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-5">
          <GaugeChart
            metric="Cumulative Layout Shift"
            data={data?.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE}
          />
          <GaugeChart
            metric="Time to First Byte"
            data={
              data?.loadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE
            }
          />
          <GaugeChart
            metric="First Contentful Paint"
            data={data?.loadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS}
          />
          <GaugeChart
            metric="Interaction to Next Paint"
            data={data?.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT}
          />
          <GaugeChart
            metric="Largest Contentful Paint"
            data={data?.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS}
          />
        </div>
        <h3 className="text-xl">
          Origin Loading Experience:{' '}
          <strong>{data?.originLoadingExperience.overall_category}</strong>
        </h3>
        <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-5">
          <GaugeChart
            metric="Cumulative Layout Shift"
            data={
              data?.originLoadingExperience.metrics
                .CUMULATIVE_LAYOUT_SHIFT_SCORE
            }
          />
          <GaugeChart
            metric="Time to First Byte"
            data={
              data?.originLoadingExperience.metrics
                .EXPERIMENTAL_TIME_TO_FIRST_BYTE
            }
          />
          <GaugeChart
            metric="First Contentful Paint"
            data={
              data?.originLoadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS
            }
          />
          <GaugeChart
            metric="Interaction to Next Paint"
            data={
              data?.originLoadingExperience.metrics.INTERACTION_TO_NEXT_PAINT
            }
          />
          <GaugeChart
            metric="Largest Contentful Paint"
            data={
              data?.originLoadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS
            }
          />
        </div>
        <br />
        <br />
        lighthouseResult
        <br />
        title:{' '}
        {JSON.stringify(data?.lighthouseResult?.categories?.performance.title)}
        <br />
        score:{' '}
        {JSON.stringify(data?.lighthouseResult?.categories?.performance.score)}
        <br />
        lighthouseResult
        <br />
        categoryGroups:{' '}
        {JSON.stringify(data?.lighthouseResult?.categories?.categoryGroups)}
        <br />
        <br />
        <br />
        All data
        <br />
        {JSON.stringify(data)}
      </AccordionContent>
    </AccordionItem>
  );
}
