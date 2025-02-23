import {
  Accordion,
} from '@/components/ui/accordion';
import { UrlLookupForm } from '@/components/common/UrlLookupForm';

import { updateURl } from '@/lib/utils';
import { HistoricalChartsSection } from '@/components/historical/HistoricalChartsSection';

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
            Historical web performance {url}
          </div>

          <Accordion type="multiple" className="w-full">

            <HistoricalChartsSection url={url} />
            <HistoricalChartsSection url={url} formFactor="PHONE" />
            <HistoricalChartsSection url={url} formFactor="TABLET" />
            <HistoricalChartsSection url={url} formFactor="DESKTOP" />
            <HistoricalChartsSection origin={url} />
            <HistoricalChartsSection origin={url} formFactor="PHONE" />
            <HistoricalChartsSection origin={url} formFactor="TABLET" />
            <HistoricalChartsSection origin={url} formFactor="DESKTOP" />
          </Accordion>
        </>
      )}
    </div>
  );
}
