import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { CurrentPerformanceSection } from '@/components/latest-crux/CurrentPerformanceSection';

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
                Latest Crux Report {url ? ` for ${url} ` : ''}
            </h1>
            {!url ? (
                <UrlLookupForm />
            ) : (
                <CurrentPerformanceSection url={url} />
            )}
        </div>
    );
}
