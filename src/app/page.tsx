import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RedYellowGreenChart } from "./_components/Histogram";
import * as Sentry from "@sentry/nextjs";
import { CruxDate, cruxHistogramSchema, CruxHistoryReport, cruxReportSchema, urlSchema } from "./lib/scema";
import { AccordionItem, Accordion, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { formatDate } from "@/lib/utils";
import { HistoricalChart } from "./_components/HistoricalChart";

const pageSpeedURL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const makePageSpeedURL = (testURL: string) => {
  console.log(process.env.PAGESPEED_INSIGHTS_API);
  return `${pageSpeedURL}?url=${encodeURIComponent(testURL)}&key=${process.env.PAGESPEED_INSIGHTS_API}`
}

const requestPageSpeedData = async (testURL: string) => {
  try {

    const response = await fetch(makePageSpeedURL(testURL))
    if (!response.ok) {
      return null;
    }
    const data = await response.json()
    return data
  } catch (error) {
    return null
  }
}

type formFactor = 'PHONE' | 'TABLET' | 'DESKTOP' | 'ALL_FORM_FACTORS';
const getCurrentCruxData = async (testURL: string, formFactor: formFactor) => {
  try {

    const request = await fetch(`https://content-chromeuxreport.googleapis.com/v1/records:queryRecord?alt=json&key=${process.env.PAGESPEED_INSIGHTS_API}`, {
      "body": JSON.stringify({ "origin": testURL, "formFactor": formFactor }),
      "method": "POST"
    });
    if (!request.ok) {
      return null;
    }
    const data = await request.json();
    return cruxReportSchema.parse(data);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}

const getHistoricalCruxData = async (testURL: string, formFactor: formFactor) => {
  try {
    const request = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord?key=${process.env.PAGESPEED_INSIGHTS_API}`, {
      "body": JSON.stringify({ "origin": testURL, "formFactor": formFactor }),
      "method": "POST"
    });
    if (!request.ok) {
      return null;
    }
    const data = await request.json();
    return CruxHistoryReport.parse(data);
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;

  let pramUrl = params.url as string;
  if (pramUrl && !pramUrl.startsWith('https://') && !pramUrl.startsWith('http://')) {
    pramUrl = 'https://' + pramUrl;
  }
  const url = urlSchema.safeParse(pramUrl).data;
  return (
    <div>
      <h1 className="text-center mx-auto text-xl font-extrabold">Web Performance Report</h1>
      {!pramUrl ? <><h2 className="text-center mx-auto text-lg font-extrabold"> please enter a url that you want a perf report on</h2>
        <form className="mx-auto max-w-[80ch] flex gap-3" method="GET"  >
          <Input className="min-w-[60]" type="text" placeholder="url" name="url" />
          <Button>Submit</Button>
        </form>
      </> : null
      }
      {url ?
        <>
          <h2 className="text-center mx-auto text-lg font-extrabold"> Web perf report for {url}</h2>
          <Accordion type="multiple" className="w-full">
            <CurrentPerformanceCharts url={url} formFactor="PHONE" />
            <CurrentPerformanceCharts url={url} formFactor="TABLET" />
            <CurrentPerformanceCharts url={url} formFactor="DESKTOP" />
            <ChartsHistoricalSection url={url} formFactor="ALL_FORM_FACTORS" />
            <ChartsHistoricalSection url={url} formFactor="PHONE" />
            <ChartsHistoricalSection url={url} formFactor="TABLET" />
            <ChartsHistoricalSection url={url} formFactor="DESKTOP" />
          </Accordion></>
        : null}

    </div>
  );
}

function formatFormFactor(string: string) {
  return string.replaceAll('_', ' ').toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')

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
  if(!metrics){ return null;}
  return (
    <AccordionItem value={`current-${formFactor}`}>
      <AccordionTrigger>Latest Performance Report For {formatFormFactor(formFactor)} Devices</AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-2 gap-2">
          <RedYellowGreenChart
            title="Cumulative Layout Shift"
            dateRage={date}
            histogramData={metrics.cumulative_layout_shift.histogram}
            percentiles={metrics.cumulative_layout_shift.percentiles}
          />
          <RedYellowGreenChart
            title="Experimental Time to First Byte"
            dateRage={date}
            histogramData={metrics.experimental_time_to_first_byte.histogram}
            percentiles={metrics.experimental_time_to_first_byte.percentiles}
          />
          <RedYellowGreenChart
            title="Interaction to Next Paint"
            dateRage={date}
            histogramData={metrics.interaction_to_next_paint.histogram}
            percentiles={metrics.interaction_to_next_paint.percentiles}
          />
          <RedYellowGreenChart
            title="Largest Contentful Paint"
            dateRage={date}
            histogramData={metrics.largest_contentful_paint.histogram}
            percentiles={metrics.largest_contentful_paint.percentiles}
          />
          <RedYellowGreenChart
            title="Round Trip Time"
            dateRage={date}
            histogramData={metrics.round_trip_time.histogram}
            percentiles={metrics.round_trip_time.percentiles}
          />
          <RedYellowGreenChart
            title="First Contentful Paint"
            dateRage={date}
            histogramData={metrics.first_contentful_paint.histogram}
            percentiles={metrics.first_contentful_paint.percentiles}
          />
        </div>
      </AccordionContent>
    </AccordionItem>)
} 