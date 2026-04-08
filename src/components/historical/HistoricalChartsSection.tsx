import { getHistoricalCruxData } from "@/lib/services";
import { fetchCruxOriginUrlFormFactorGrid } from "@/lib/cruxOriginUrlFormFactorGrid";

import { HistoricalDashboard } from "@/components/historical/HistoricalDashboard";

export async function HistoricalChartsSection({ url }: { url: string }) {
  const cruxData = await fetchCruxOriginUrlFormFactorGrid(url, getHistoricalCruxData);
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
