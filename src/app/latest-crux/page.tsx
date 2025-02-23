import { UrlLookupForm } from '@/components/common/UrlLookupForm';
import { updateURl } from '@/lib/utils';
import { CurrentPerformanceCharts } from '@/components/latest-crux/CurrentPerformanceCharts';

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
                        Most recent Crux data for {url}
                    </div>
                    <CurrentPerformanceCharts url={url} />
                </>
            )}
        </div>
    );
}
