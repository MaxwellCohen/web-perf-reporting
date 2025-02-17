import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RedYellowGreenChart } from "./_components/RedYellowGreenChart";
import { CruxDate, cruxReportSchema, urlSchema } from "./lib/scema";

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

type formFactor = 'PHONE' | 'TABLET' | 'DESKTOP'
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
    return cruxReportSchema.safeParse(data);
  } catch (error) {
    return null;
  }
}


const formatDate = (data?: CruxDate) => {
  if (!data) {
    return ""
  }
  const date = new Date(data.year, data.month - 1, data.day);
  return date.toLocaleDateString()
}

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;

  let pramUrl = params.url as string;
  if (pramUrl && !pramUrl.startsWith('https://') && !pramUrl.startsWith('http://')) {
    pramUrl = 'https://' + pramUrl;
  }
  const url = urlSchema.safeParse(pramUrl).data;
  console.log(pramUrl, url);
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
          <ChartsSection url={url} formFactor="PHONE" />
          <ChartsSection url={url} formFactor="TABLET" />
          <ChartsSection url={url} formFactor="DESKTOP" /></>
        : null}

    </div>
  );
}



async function ChartsSection({ url, formFactor }: { url: string, formFactor: formFactor }) {
  const data = await getCurrentCruxData(url, formFactor);
  const date = `${formatDate(data?.data?.record?.collectionPeriod?.firstDate)} to ${formatDate(data?.data?.record?.collectionPeriod?.lastDate)}`

  console.log(data);
  return (
    <details>
      <summary>Performance Report for {url} on {formFactor.toLowerCase()}</summary>

      {data?.success ? <div className="grid grid-cols-3 mt-2 gap-2">
        <RedYellowGreenChart
          title="Cumulative Layout Shift"
          dateRage={date}
          histogramData={data.data.record.metrics.cumulative_layout_shift.histogram}
          percentiles={data.data.record.metrics.cumulative_layout_shift.percentiles}
        />
        <RedYellowGreenChart
          title="Experimental Time to First Byte"
          dateRage={date}
          histogramData={data.data.record.metrics.experimental_time_to_first_byte.histogram}
          percentiles={data.data.record.metrics.experimental_time_to_first_byte.percentiles}
        />
        <RedYellowGreenChart
          title="Interaction to Next Paint"
          dateRage={date}
          histogramData={data.data.record.metrics.interaction_to_next_paint.histogram}
          percentiles={data.data.record.metrics.interaction_to_next_paint.percentiles}
        />
        <RedYellowGreenChart
          title="Largest Contentful Paint"
          dateRage={date}
          histogramData={data.data.record.metrics.largest_contentful_paint.histogram}
          percentiles={data.data.record.metrics.largest_contentful_paint.percentiles}
        />
        <RedYellowGreenChart
          title="Round Trip Time"
          dateRage={date}
          histogramData={data.data.record.metrics.round_trip_time.histogram}
          percentiles={data.data.record.metrics.round_trip_time.percentiles}
        />
        <RedYellowGreenChart
          title="First Contentful Paint"
          dateRage={date}
          histogramData={data.data.record.metrics.first_contentful_paint.histogram}
          percentiles={data.data.record.metrics.first_contentful_paint.percentiles}
        />
      </div> : <div>No data available</div>}
    </details>)
} 