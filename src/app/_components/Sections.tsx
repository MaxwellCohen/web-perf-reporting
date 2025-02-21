
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getHistoricalCruxData, getCurrentCruxData, requestPageSpeedData } from "@/lib/services";
import { formatDate, formatFormFactor } from "@/lib/utils";
import { CurrentPerformanceCard } from "./CurrentPerformanceCard";
import { HistoricalPerformanceCard } from "./HistoricalPerformanceCard";
import GaugeChart from "./PageSpeedGuageChart";
import { formFactor } from "@/lib/services";


function groupBy(list: any[], keyGetter: (item: any) => string) {
  const map = new Map();
  list.forEach((item) => {
    const key = keyGetter(item);
    const collection = map.get(key);
    if (!collection) {
      map.set(key, [item]);
    } else {
      collection.push(item);
    }
  }
  );
  return Object.fromEntries(map.entries());
}

export async function ChartsHistoricalSection({ url, formFactor, origin }: { url?: string, formFactor: formFactor, origin?: string }) {

  const currentCruxHistoricalResult = await getHistoricalCruxData({ url, formFactor, origin });
  console.log(currentCruxHistoricalResult)
  if (!currentCruxHistoricalResult) {
    return null;
  }
  const groupedMetics = groupBy(currentCruxHistoricalResult, ({ metric_name }) => metric_name || '');
  

  console.log(groupedMetics);
  return (
    <AccordionItem value={`historical-${formFactor}`}>
      <AccordionTrigger>Historical Performance Report For {formatFormFactor(formFactor)} Devices</AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-2 gap-2">
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

    </AccordionItem>)
}

export async function CurrentPerformanceCharts({ url, formFactor, origin }: { url?: string, origin?: string, formFactor: formFactor }) {

  const data = await getCurrentCruxData({ url, formFactor, origin });
  if (!data) { return null; }
  const groupedMetics = groupBy(data, ({ metric_name }) => metric_name || '');
  return (
    <AccordionItem value={`current-${formFactor}`}>
      <AccordionTrigger>Latest Performance Report For {formatFormFactor(formFactor)} Devices</AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-2 gap-2">
          <CurrentPerformanceCard
            title="Cumulative Layout Shift"

            histogramData={groupedMetics?.cumulative_layout_shift?.[0]}
          />
          <CurrentPerformanceCard
            title="Experimental Time to First Byte"

            histogramData={groupedMetics?.experimental_time_to_first_byte?.[0]}

          />
          <CurrentPerformanceCard
            title="Interaction to Next Paint"

            histogramData={groupedMetics?.interaction_to_next_paint?.[0]}

          />
          <CurrentPerformanceCard
            title="Largest Contentful Paint"

            histogramData={groupedMetics?.largest_contentful_paint?.[0]}

          />
          <CurrentPerformanceCard
            title="Round Trip Time"

            histogramData={groupedMetics?.round_trip_time?.[0]}
          />
          <CurrentPerformanceCard
            title="First Contentful Paint"

            histogramData={groupedMetics?.first_contentful_paint?.[0]}
          />
        </div>
      </AccordionContent>
    </AccordionItem>)
}

export async function PageSpeedInsights({ url, formFactor }: { url: string, formFactor: formFactor }) {

  const data = await requestPageSpeedData(url, formFactor);
  // console.log(data);
  return (
    <AccordionItem value={`PageSpeed-${formFactor}`}>
      <AccordionTrigger>Page speed Insights For {formatFormFactor(formFactor)} Devices</  AccordionTrigger>
      <AccordionContent>


        <h3 className="text-xl">Page Loading Experience : <strong>{data?.loadingExperience.overall_category}</strong></h3>
        <div className="grid grid-cols-3 md:grid-cols-5  mt-2 gap-2">
          <GaugeChart metric="Cumulative Layout Shift" data={data?.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE} />
          <GaugeChart metric="Time to First Byte" data={data?.loadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE} />
          <GaugeChart metric="First Contentful Paint" data={data?.loadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS} />
          <GaugeChart metric="Interaction to Next Paint" data={data?.loadingExperience.metrics.INTERACTION_TO_NEXT_PAINT} />
          <GaugeChart metric="Largest Contentful Paint" data={data?.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS} />
        </div>
        <h3 className="text-xl">Origin Loading Experience: <strong>{data?.originLoadingExperience.overall_category}</strong></h3>
        <div className="grid grid-cols-3 md:grid-cols-5  mt-2 gap-2">
          <GaugeChart metric="Cumulative Layout Shift" data={data?.originLoadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE} />
          <GaugeChart metric="Time to First Byte" data={data?.originLoadingExperience.metrics.EXPERIMENTAL_TIME_TO_FIRST_BYTE} />
          <GaugeChart metric="First Contentful Paint" data={data?.originLoadingExperience.metrics.FIRST_CONTENTFUL_PAINT_MS} />
          <GaugeChart metric="Interaction to Next Paint" data={data?.originLoadingExperience.metrics.INTERACTION_TO_NEXT_PAINT} />
          <GaugeChart metric="Largest Contentful Paint" data={data?.originLoadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS} />
        </div>

        <br />
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