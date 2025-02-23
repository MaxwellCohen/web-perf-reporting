import {
  getHistoricalCruxData,

} from '@/lib/services';

import { HistoricalDashboard } from './HistoricalDashbord';

export async function HistoricalChartsSection({
  url,
  
}: {
  url: string;
}) {

  const cruxData = await Promise.all([
    getHistoricalCruxData({ origin: url, formFactor: undefined }),
    getHistoricalCruxData({ origin: url, formFactor: 'DESKTOP' }),
    getHistoricalCruxData({ origin: url, formFactor: 'TABLET' }),
    getHistoricalCruxData({ origin: url, formFactor: 'PHONE' }),
    getHistoricalCruxData({ url, formFactor: undefined }),
    getHistoricalCruxData({ url, formFactor: 'DESKTOP' }),
    getHistoricalCruxData({ url, formFactor: 'TABLET' }),
    getHistoricalCruxData({ url, formFactor: 'PHONE' }),
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
    <HistoricalDashboard reportMap={cruxReport} />
  </div>
  );
}



