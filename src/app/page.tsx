import { urlSchema } from '@/lib/schema';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { UrlLookupForm } from '@/app/_components/UrlLookupForm';
import { Suspense } from 'react';
import {
  CurrentPerformanceCharts,
  ChartsHistoricalSection,
} from './_components/Sections';

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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const url = updateURl(params.url as string);

  return (
    <div>
      <h1 className="mx-auto text-center text-3xl font-extrabold">
        Web Performance Report
      </h1>
      {!url ? (
        <UrlLookupForm />
      ) : (
        <>
          <div className="mx-auto text-center text-2xl font-extrabold">
            Web Perf Report For {url}
          </div>

          <Accordion type="multiple" className="w-full">
            <CurrentPerformanceCharts url={url} />
            <CurrentPerformanceCharts url={url} formFactor="PHONE" />
            <CurrentPerformanceCharts url={url} formFactor="TABLET" />
            <CurrentPerformanceCharts url={url} formFactor="DESKTOP" />
            <CurrentPerformanceCharts origin={url} />
            <CurrentPerformanceCharts origin={url} formFactor="PHONE" />
            <CurrentPerformanceCharts origin={url} formFactor="TABLET" />
            <CurrentPerformanceCharts origin={url} formFactor="DESKTOP" />

            <ChartsHistoricalSection url={url} />
            <ChartsHistoricalSection url={url} formFactor="PHONE" />
            <ChartsHistoricalSection url={url} formFactor="TABLET" />
            <ChartsHistoricalSection url={url} formFactor="DESKTOP" />
            <ChartsHistoricalSection origin={url} />
            <ChartsHistoricalSection origin={url} formFactor="PHONE" />
            <ChartsHistoricalSection origin={url} formFactor="TABLET" />
            <ChartsHistoricalSection origin={url} formFactor="DESKTOP" />

            {/* <Suspense fallback={<div>Loading...</div>}> */}
            {/* <PageSpeedInsights url={url} formFactor="DESKTOP" /> */}
            {/* </Suspense>  */}
          </Accordion>
        </>
      )}
    </div>
  );
}
