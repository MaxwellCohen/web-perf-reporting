/* eslint-disable @next/next/no-img-element */
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formFactor } from '@/lib/services';
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { formatFormFactor } from '@/lib/utils';

import GaugeChart from '@/components/common/PageSpeedGuageChart';

import {
  TableCaption,
  TableHeader,
  TableRow,
  Table,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';

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
            <Table>
              <TableCaption>A list of entities that {url} uses </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead >Name </TableHead>
                  <TableHead >Is First Party </TableHead>
                  <TableHead >Is Unrecognized </TableHead>
                  <TableHead >Origins </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lighthouseResult.entities.map((entity, i) => (
                  <TableRow
                    key={`${i}-${entity.name}`}
                  >
                    <TableCell> {entity.name} </TableCell>
                    <TableCell>
                      {' '}
                      {entity.isFirstParty ? '✅ - yes' : '❌ - no'}{' '}
                    </TableCell>
                    <TableCell>
                      {' '}
                      {entity.isUnrecognized ? '✅ - yes' : '❌ - no'}{' '}
                    </TableCell>
                    <TableCell>
                      {' '}
                      {entity.origins.map((o, i) => (
                        <div key={`${i}-${o}`}>{o} </div>
                      ))}{' '}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
