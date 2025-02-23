import {
    getCurrentCruxData,
    formFactor,
} from '@/lib/services';
import { formatFormFactor } from '@/lib/utils';

import { CurrentPerformanceDashboard } from '@/components/latest-crux/PerformanceDashboard';


export async function CurrentPerformanceCharts({
    url,
    formFactor,
    origin,
}: {
    url?: string;
    origin?: string;
    formFactor?: formFactor;
}) {
    const report = await getCurrentCruxData({ url, formFactor, origin });
    if (!report) {
        return null;
    }

    return (
        <div className='flex flex-col' >
            <h2 className="text-xl">
                Latest Performance Report For {formatFormFactor(formFactor)} Devices{' '}
                {url ? `for the page` : 'for the origin'}
            </h2>
            <CurrentPerformanceDashboard report={report} />
        </div>
    );
}