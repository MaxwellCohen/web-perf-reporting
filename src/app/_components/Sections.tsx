/* eslint-disable @next/next/no-img-element */
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
import { formatCruxReport, formatFormFactor, groupBy } from '@/lib/utils';

import GaugeChart from './PageSpeedGuageChart';
import { formFactor } from '@/lib/services';
import { HistoricalPerformanceCard } from './HistoricalPerformanceCard';
import { CurrentPerformanceDashboard } from './CurrentPerformanceDashboard';

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
  if (!report) {
    return null;
  }

  return (
    <AccordionItem value={`current-${formFactor}`}>
      <AccordionTrigger>
        <h2 className="text-xl">
          Latest Performance Report For {formatFormFactor(formFactor)} Devices{' '}
          {url ? `for the page` : 'for the origin'}
        </h2>
      </AccordionTrigger>
      <AccordionContent>
        <CurrentPerformanceDashboard report={report} />
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
  if (!data) {
    return null;
  }
  console.log(data?.lighthouseResult.entities);
  const screenshot = data.lighthouseResult.fullPageScreenshot?.screenshot;
  return (
    <AccordionItem value={`PageSpeed-${formFactor}-${url}`}>
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
        <div className="grid grid-cols-3">
          {screenshot ? (
            <img
              alt={'fullscreen image'}
              width={80}
              src={screenshot.data}
              className={`w-20 aspect-[${screenshot.width}/${screenshot.height}]`}
            />
          ) : null}
        </div>
        {data?.lighthouseResult?.entities ? (
          <>
            <div className="grid grid-cols-1">
              <div className="grid grid-cols-4 border">
                <div>Name </div>
                <div>is First Party </div>
                <div>is Unrecognized </div>
                <div>origins </div>
              </div>
              {data.lighthouseResult.entities.map((entity, i) => (
                <div
                  key={`${i}-${entity.name}`}
                  className="grid grid-cols-4 border"
                >
                  <div> {entity.name} </div>
                  <div> {entity.isFirstParty ? '✅ - yes' : '❌ - no'} </div>
                  <div> {entity.isUnrecognized ? '✅ - yes' : '❌ - no'} </div>
                  <div>
                    {' '}
                    {entity.origins.map((o, i) => (
                      <div key={`${i}-${o}`}>{o} </div>
                    ))}{' '}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
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
