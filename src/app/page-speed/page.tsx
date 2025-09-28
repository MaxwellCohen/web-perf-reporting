import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { PageSpeedInsightsDashboard } from '@/components/page-speed/pageSpeedInsightsDashboard';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const url = updateURl(params.url as string);

  return (
    <>
      {!url ? (
        <UrlLookupForm />
      ) : (
          <PageSpeedInsightsDashboardWrapper url={url} />
      )}
    </>
  );
}

async function PageSpeedInsightsDashboardWrapper({ url }: { url: string }) {
  requestPageSpeedData(url);
  return (
    <PageSpeedInsightsDashboard data={[null, null]} labels={['Mobile', 'Desktop']} url={url} />
  );
}
