import { CurrentPerformanceChart } from "./_components/CurrentPerformanceChart";
import { urlSchema } from "@/lib/schema";
import { AccordionItem, Accordion, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { formatDate, formatFormFactor } from "@/lib/utils";
import { getCurrentCruxData, getHistoricalCruxData } from "@/lib/services";
import { HistoricalChart } from "./_components/HistoricalChart";
import { UrlLookupForm } from "./_components/UrlLookupForm";

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
          </Accordion></>
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
          <HistoricalChart
            title="Cumulative Layout Shift"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalChart
            title="Experimental Time to First Byte"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalChart
            title="Interaction to Next Paint"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalChart
            title="Largest Contentful Paint"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalChart
            title="Round Trip Time"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogramTimeseries}
            collectionPeriods={collectionPeriods}
          />
          <HistoricalChart
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
          <CurrentPerformanceChart
            title="Cumulative Layout Shift"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogram}
            percentiles={metrics.cumulative_layout_shift.percentiles}
          />
          <CurrentPerformanceChart
            title="Experimental Time to First Byte"
            dateRage={date}
            histogramData={metrics.experimental_time_to_first_byte.histogram}
            percentiles={metrics.experimental_time_to_first_byte.percentiles}
          />
          <CurrentPerformanceChart
            title="Interaction to Next Paint"
            dateRage={date}
            histogramData={metrics.interaction_to_next_paint.histogram}
            percentiles={metrics.interaction_to_next_paint.percentiles}
          />
          <CurrentPerformanceChart
            title="Largest Contentful Paint"
            dateRage={date}
            histogramData={metrics.largest_contentful_paint.histogram}
            percentiles={metrics.largest_contentful_paint.percentiles}
          />
          <CurrentPerformanceChart
            title="Round Trip Time"
            dateRage={date}
            histogramData={metrics.round_trip_time.histogram}
            percentiles={metrics.round_trip_time.percentiles}
          />
          <CurrentPerformanceChart
            title="First Contentful Paint"
            dateRage={date}
            histogramData={metrics.first_contentful_paint.histogram}
            percentiles={metrics.first_contentful_paint.percentiles}
          />
        </div>
      </AccordionContent>
    </AccordionItem>)
}