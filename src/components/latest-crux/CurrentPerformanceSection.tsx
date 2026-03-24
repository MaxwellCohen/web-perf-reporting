import { unstable_cache } from 'next/cache';
import { CurrentPerformanceDashboard } from '@/components/latest-crux/PerformanceDashboard';
import { buildCruxReportMap } from '@/components/latest-crux/lib/buildCruxReportMap';
import { getCurrentCruxData } from '@/lib/services';

const CRUX_DASHBOARD_CACHE_SECONDS = 86_400;

async function fetchLatestCruxDashboardBundle(url: string) {
  return Promise.all([
    getCurrentCruxData({ origin: url, formFactor: undefined }),
    getCurrentCruxData({ origin: url, formFactor: 'DESKTOP' }),
    getCurrentCruxData({ origin: url, formFactor: 'TABLET' }),
    getCurrentCruxData({ origin: url, formFactor: 'PHONE' }),
    getCurrentCruxData({ url, formFactor: undefined }),
    getCurrentCruxData({ url, formFactor: 'DESKTOP' }),
    getCurrentCruxData({ url, formFactor: 'TABLET' }),
    getCurrentCruxData({ url, formFactor: 'PHONE' }),
  ]);
}

export async function CurrentPerformanceSection({ url }: { url: string }) {
  const cruxData = await unstable_cache(
    () => fetchLatestCruxDashboardBundle(url),
    ['latest-crux-dashboard', url],
    { revalidate: CRUX_DASHBOARD_CACHE_SECONDS },
  )();

  const cruxReport = buildCruxReportMap(cruxData);

  return (
    <div className="flex flex-col mt-4">
      <CurrentPerformanceDashboard reportMap={cruxReport} />
    </div>
  );
}
