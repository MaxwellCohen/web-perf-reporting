import { CurrentPerformanceCard } from "@/app/_components/CurrentPerformanceCard";
import { urlSchema } from "@/lib/schema";
import { AccordionItem, Accordion, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { formatDate, formatFormFactor } from "@/lib/utils";
import { getCurrentCruxData, getHistoricalCruxData, requestPageSpeedData } from "@/lib/services";
import { HistoricalPerformanceCard } from "@/app/_components/HistoricalPerformanceCard";
import { UrlLookupForm } from "@/app/_components/UrlLookupForm";
import { Suspense } from "react";
import GaugeChart from "./_components/PageSpeedGuageChart";

type formFactor = 'PHONE' | 'TABLET' | "DESKTOP" | "ALL_FORM_FACTORS"

function updateURl(url?: string) {
  if (!url) {
    return '';
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  if (!url.includes('www.')) {
    const urlParts = url.split('://');
    url = urlParts[0] + '://www.' + urlParts[1];
  }
  return urlSchema.safeParse(url).data ?? '';
}


export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;

  let url = updateURl(params.url as string);

  return (
    <div>
      <h1 className="text-center mx-auto text-xl font-extrabold">Web Performance Report</h1>
      {!url ?
        <UrlLookupForm />
        :
        <>
          <h2 className="text-center mx-auto text-lg font-extrabold"> Web Perf Report For {url}</h2>

          <Accordion type="multiple" className="w-full">
            <CurrentPerformanceCharts url={url} formFactor="PHONE" />
            <CurrentPerformanceCharts url={url} formFactor="TABLET" />
            <CurrentPerformanceCharts url={url} formFactor="DESKTOP" />
            <ChartsHistoricalSection url={url} formFactor="ALL_FORM_FACTORS" />
            <ChartsHistoricalSection url={url} formFactor="PHONE" />
            <ChartsHistoricalSection url={url} formFactor="TABLET" />
            <ChartsHistoricalSection url={url} formFactor="DESKTOP" />
            <Suspense fallback={<div>Loading...</div>}>
              <PageSpeedInsights url={url} formFactor="DESKTOP" />
            </Suspense>
          </Accordion>
        </>
      }
    </div>
  );
}

async function ChartsHistoricalSection({ url, formFactor }: { url: string, formFactor: formFactor }) {
  const currentCruxHistoricalResult = await getHistoricalCruxData(url, formFactor);
  const collectionPeriods = currentCruxHistoricalResult?.record.collectionPeriods;
  const metrics = currentCruxHistoricalResult?.record.metrics;
  if (!collectionPeriods?.length || !metrics) {
    return null;
  }
  const date = `${formatDate(collectionPeriods[0]?.firstDate)} to ${formatDate(collectionPeriods.at(-1)?.lastDate)}`


  return (
    <AccordionItem value={`historical-${formFactor}`}>
      <AccordionTrigger>Historical Performance Report For {formatFormFactor(formFactor)} Devices</AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-2 gap-2">
          <HistoricalPerformanceCard
            title="Cumulative Layout Shift"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalPerformanceCard
            title="Experimental Time to First Byte"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalPerformanceCard
            title="Interaction to Next Paint"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalPerformanceCard
            title="Largest Contentful Paint"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalPerformanceCard
            title="Round Trip Time"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalPerformanceCard
            title="First Contentful Paint"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
        </div>
      </AccordionContent>

    </AccordionItem>)
}

async function CurrentPerformanceCharts({ url, formFactor }: { url: string, formFactor: formFactor }) {
  const data = await getCurrentCruxData(url, formFactor);
  const collectionPeriod = data?.record?.collectionPeriod;
  const metrics = data?.record?.metrics;
  const date = `${formatDate(collectionPeriod?.firstDate)} to ${formatDate(collectionPeriod?.lastDate)}`
  if (!metrics) { return null; }
  return (
    <AccordionItem value={`current-${formFactor}`}>
      <AccordionTrigger>Latest Performance Report For {formatFormFactor(formFactor)} Devices</AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-2 gap-2">
          <CurrentPerformanceCard
            title="Cumulative Layout Shift"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogram}
            percentiles={metrics.cumulative_layout_shift.percentiles}
          />
          <CurrentPerformanceCard
            title="Experimental Time to First Byte"
            dateRage={date}
            histogramData={metrics.experimental_time_to_first_byte.histogram}
            percentiles={metrics.experimental_time_to_first_byte.percentiles}
          />
          <CurrentPerformanceCard
            title="Interaction to Next Paint"
            dateRage={date}
            histogramData={metrics.interaction_to_next_paint.histogram}
            percentiles={metrics.interaction_to_next_paint.percentiles}
          />
          <CurrentPerformanceCard
            title="Largest Contentful Paint"
            dateRage={date}
            histogramData={metrics.largest_contentful_paint.histogram}
            percentiles={metrics.largest_contentful_paint.percentiles}
          />
          <CurrentPerformanceCard
            title="Round Trip Time"
            dateRage={date}
            histogramData={metrics.round_trip_time.histogram}
            percentiles={metrics.round_trip_time.percentiles}
          />
          <CurrentPerformanceCard
            title="First Contentful Paint"
            dateRage={date}
            histogramData={metrics.first_contentful_paint.histogram}
            percentiles={metrics.first_contentful_paint.percentiles}
          />
        </div>
      </AccordionContent>
    </AccordionItem>)
}

async function PageSpeedInsights({ url, formFactor }: { url: string, formFactor: formFactor }) {
  const data = await requestPageSpeedData(url, formFactor);

  return (
    <AccordionItem value={`PageSpeed-${formFactor}`}>
      <AccordionTrigger>Page speed Insights For {formatFormFactor(formFactor)} Devices</  AccordionTrigger>
      <AccordionContent>


      <h3 className="text-xl">Loading Experience : <strong>{data?.loadingExperience.overall_category}</strong></h3>
        <div className="grid grid-cols-3 md:grid-cols-5  mt-2 gap-2">
          <GaugeChart metric="Cumulative Layout Shift" value={data?.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile || 0} />
          <GaugeChart metric="Time to First Byte" value={data?.loadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE.percentile || 0} />
          <GaugeChart metric="First Contentful Paint" value={data?.loadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS.percentile || 0} />
          <GaugeChart metric="Interaction to Next Paint" value={data?.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT.percentile || 0} />
          <GaugeChart metric="Largest Contentful Paint" value={data?.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile || 0} />
        </div>
        <h3 className="text-xl">Origin Loading Experience: <strong>{data?.originLoadingExperience.overall_category}</strong></h3>
        <div className="grid grid-cols-3 md:grid-cols-5  mt-2 gap-2">
          <GaugeChart metric="Cumulative Layout Shift" value={data?.originLoadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile || 0} />
          <GaugeChart metric="Time to First Byte" value={data?.originLoadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE.percentile || 0} />
          <GaugeChart metric="First Contentful Paint" value={data?.originLoadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS.percentile || 0} />
          <GaugeChart metric="Interaction to Next Paint" value={data?.originLoadingExperience.metrics.INTERACTION_TO_NEXT_PAINT.percentile || 0} />
          <GaugeChart metric="Largest Contentful Paint" value={data?.originLoadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS.percentile || 0} />
        </div>
        
      loadingExperience
      <br />
        {JSON.stringify(data?.loadingExperience.overall_category)}
        <br />
        {JSON.stringify(data?.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE)}
        <br />
        {JSON.stringify(data?.loadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE)}
        <br />
        {JSON.stringify(data?.loadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS)}
        <br />
        {JSON.stringify(data?.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT)}
        <br />
        {JSON.stringify(data?.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS)}
        <br />  
        originLoadingExperience
        <br />
        {JSON.stringify(data?.originLoadingExperience.overall_category)}
        <br />
        {JSON.stringify(data?.originLoadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE)}
        <br />
        {JSON.stringify(data?.originLoadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE)}
        <br />
        {JSON.stringify(data?.originLoadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS)}
        <br />
        {JSON.stringify(data?.originLoadingExperience.metrics.INTERACTION_TO_NEXT_PAINT)}
        <br />
        {JSON.stringify(data?.originLoadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS)}
        <br />
        lighthouseResult
        <br />
        title: {JSON.stringify(data?.lighthouseResult?.categories?.performance.title)}
        <br />
        score: {JSON.stringify(data?.lighthouseResult?.categories?.performance.score)}
        <br />
        lighthouseResult
        <br />
        categoryGroups: {JSON.stringify(data?.lighthouseResult?.categories?.categoryGroups)}
        <br />
        <br />
        <br />
        All data
        <br />
        {JSON.stringify(data)}
      </AccordionContent>
    </AccordionItem>)
}