'use client';

import GaugeChart from '@/components/common/PageSpeedGaugeChart';
import type { CruxHistoryItem, UserPageLoadMetricV5 } from '@/lib/schema';

export function CruxGaugeChart({
  histogramData,
}: {
  histogramData: CruxHistoryItem;
}) {
  const data: UserPageLoadMetricV5 = {
    percentile: +(histogramData.P75 ?? 0),
    category: '',
    distributions: [
      {
        min: 0,
        max: histogramData.good_max ?? 0,
        proportion: histogramData.good_density ?? 0,
      },
      {
        min: histogramData.good_max ?? 0,
        max: histogramData.ni_max ?? 0,
        proportion: histogramData.ni_density ?? 0,
      },
      {
        min: histogramData.ni_max ?? 0,
        max: Math.max(histogramData.P75, histogramData.ni_max) * 1.05,
        proportion: histogramData.poor_density ?? 0,
      },
    ],
  };

  return <GaugeChart metric={''} data={data} />;
}
