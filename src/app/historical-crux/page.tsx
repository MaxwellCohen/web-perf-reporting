import { UrlLookupForm } from '@/components/common/UrlLookupForm';

import { updateURl } from '@/lib/utils';
import { HistoricalChartsSection } from '@/components/historical/HistoricalChartsSection';
import { Suspense } from 'react';

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
        Historical CrUX reports for {url ? ` for ${url} ` : ''}
      </h1>
      {!url ?
        <UrlLookupForm />
        :
        <Suspense fallback={<div>Loading...</div>}>
          <HistoricalChartsSection url={url} />
        </Suspense>
      }
    </div >
  );
}
