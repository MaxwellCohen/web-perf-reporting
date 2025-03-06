'use client';
import GaugeChart from '@/components/common/PageSpeedGaugeChart';
import { PageSpeedApiLoadingExperience } from '@/lib/schema';

export function LoadingExperienceGauges({
  experience,
}: {
  experience?: PageSpeedApiLoadingExperience;
}) {
  if (!experience) {
    return null;
  }
  const metrics: {
    metric: string;
    key: keyof PageSpeedApiLoadingExperience['metrics'];
  }[] = [
    {
      metric: 'Cumulative Layout Shift',
      key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE',
    },
    {
      metric: 'Time to First Byte',
      key: 'EXPERIMENTAL_TIME_TO_FIRST_BYTE',
    },
    {
      metric: 'First Contentful Paint',
      key: 'FIRST_CONTENTFUL_PAINT_MS',
    },
    {
      metric: 'Interaction to Next Paint',
      key: 'INTERACTION_TO_NEXT_PAINT',
    },
    {
      metric: 'Largest Contentful Paint',
      key: 'LARGEST_CONTENTFUL_PAINT_MS',
    },
  ];
  return (
    <div className="grid-auto-rows-[1fr] mt-2 grid grid-cols-[repeat(auto-fill,_minmax(180px,_1fr))] gap-2">
      {metrics.map(({ metric, key }) => (
        <GaugeChart key={key} metric={metric} data={experience.metrics[key]} />
      ))}
    </div>
  );
} 