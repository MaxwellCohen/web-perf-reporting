import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { Suspense } from 'react';
import { PageSpeedInsights } from '@/components/page-speed/PageSpeedInsights';
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';


export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const url = updateURl(params.url as string);

  if (url){
    Promise.all([requestPageSpeedData(url, 'DESKTOP'), requestPageSpeedData(url, 'MOBILE')]);
  }

  return (
    <div>
      <h1 className="mx-auto text-center text-2xl font-extrabold">
        Page Speed Insights {url ? ` for ${url}` : ''}
      </h1>
      {!url ? (
        <UrlLookupForm />
      ) : (
        <Suspense fallback={<div>Loading...</div>}>
          <PageSpeedInsights />
        </Suspense>
      )}
    </div>
  );
}
