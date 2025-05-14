import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';
import { Suspense } from 'react';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const url = updateURl(params.url as string);

  return (
    <div className='max-w-screen-2xl mx-auto'>
      <h1 className="mx-auto text-center text-2xl font-extrabold">
        Page Speed Insights {url ? ` for ${url}` : ''}
      </h1>
      {!url ? (
        <UrlLookupForm />
      ) : (
        <Suspense >
          <PageSpeedInsightsDashboardWrapper url={url} />
        </Suspense>

      )}
    </div>
  );
}


async function PageSpeedInsightsDashboardWrapper({
  url,
}: {
  url : string;
}) {
  const data = await requestPageSpeedData(url);
  return <PageSpeedInsightsDashboard
    data={data}
    labels={['Mobile', 'Desktop']}
/>
}