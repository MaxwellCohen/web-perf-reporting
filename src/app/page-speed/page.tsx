import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const url = updateURl(params.url as string);
  const data = await Promise.all([
    requestPageSpeedData(url, 'MOBILE'),
    requestPageSpeedData(url, 'DESKTOP'),
  ]);

  return (
    <div className='max-w-screen-2xl mx-auto'>
      <h1 className="mx-auto text-center text-2xl font-extrabold">
        Page Speed Insights {url ? ` for ${url}` : ''}
      </h1>
      {!url ? (
        <UrlLookupForm />
      ) : (
        <PageSpeedInsightsDashboard
          mobileDataPrams={data[0] || undefined}
          desktopDataPrams={data[1] || undefined}
        />
      )}
    </div>
  );
}
