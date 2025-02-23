import { getCurrentCruxData } from '@/lib/services';

import { CurrentPerformanceDashboard } from '@/components/latest-crux/PerformanceDashboard';

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
  const cruxReport = {
    originAll: cruxData[0],
    originDESKTOP: cruxData[1],
    originTABLET: cruxData[2],
    originPHONE: cruxData[3],
    urlAll: cruxData[4],
    urlDESKTOP: cruxData[5],
    urlTABLET: cruxData[6],
    urlPHONE: cruxData[7],
  };

  return (
    <div className="flex flex-col mt-4">
      <CurrentPerformanceDashboard reportMap={cruxReport} />
    </div>
  );
}
