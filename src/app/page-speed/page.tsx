import { Accordion } from '@/components/ui/accordion';
import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { Suspense } from 'react';
import { PageSpeedInsights } from '@/components/page-speed/PageSpeedInsights';

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
        Page Speed PageSpeedInsights
      </h1>
      {!url ? (
        <UrlLookupForm />
      ) : (
        <>
          <div className="mx-auto text-center text-2xl font-extrabold">
            Page Speed Insights For {url}
          </div>

          <Accordion type="multiple" className="w-full">

            <Suspense fallback={<div>Loading...</div>}>
              <PageSpeedInsights url={url} formFactor="DESKTOP" />
            </Suspense>
          </Accordion>
        </>
      )}
    </div>
  );
}
