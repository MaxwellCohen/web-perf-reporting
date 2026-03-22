import { CurrentPerformanceDashboard } from '@/components/latest-crux/PerformanceDashboard';
import { buildCruxReportMap } from '@/components/latest-crux/lib/buildCruxReportMap';
import { getCurrentCruxData } from '@/lib/services';

export async function CurrentPerformanceSection({ url }: { url: string }) {
  const cruxData = await Promise.all([
    getCurrentCruxData({ origin: url, formFactor: undefined }),
    getCurrentCruxData({ origin: url, formFactor: 'DESKTOP' }),
    getCurrentCruxData({ origin: url, formFactor: 'TABLET' }),
    getCurrentCruxData({ origin: url, formFactor: 'PHONE' }),
    getCurrentCruxData({ url, formFactor: undefined }),
    getCurrentCruxData({ url, formFactor: 'DESKTOP' }),
    getCurrentCruxData({ url, formFactor: 'TABLET' }),
    getCurrentCruxData({ url, formFactor: 'PHONE' }),
  ]);

  const cruxReport = buildCruxReportMap(cruxData);

  return (
    <div className="flex flex-col mt-4">
      <CurrentPerformanceDashboard reportMap={cruxReport} />
    </div>
  );
}
