import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { requestPageSpeedData } from '@/lib/services/pageSpeedInsights.service';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const url = updateURl(params.url as string);

  if (url) {
    const publicId = await requestPageSpeedData(url);
    if (publicId) {
      console.log(`redirecting to /page-speed/${publicId}`);
      redirect(`/page-speed/${publicId}`);
    }
  }

  return <UrlLookupForm />;
}
