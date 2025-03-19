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

  return (<div className='container mx-auto'>
      <h1 className="mx-auto text-center text-2xl font-extrabold">
        Historical CrUX reports {url ? ` for ${url} ` : ''}
      </h1>
      {!url ?
        <UrlLookupForm />
        :
        <HistoricalChartsSection url={url} />

      }
    </div >
  );
}
