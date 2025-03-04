import { HorizontalGaugeChart } from '@/components/common/PageSpeedGaugeChart';
import { PageSpeedApiLoadingExperience } from '@/lib/schema';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

interface LoadingExperienceProps {
  title: string;
  experienceDesktop?: PageSpeedApiLoadingExperience;
  experienceMobile?: PageSpeedApiLoadingExperience;
  category?: string;
}

export function LoadingExperience({
  title,
  experienceDesktop,
  experienceMobile,
  category,
}: LoadingExperienceProps) {
  if (!experienceDesktop && !experienceMobile) return null;

  const metrics = [
    { metric: 'Cumulative Layout Shift', key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE' },
    { metric: 'Time to First Byte', key: 'EXPERIMENTAL_TIME_TO_FIRST_BYTE' },
    { metric: 'First Contentful Paint', key: 'FIRST_CONTENTFUL_PAINT_MS' },
    { metric: 'Interaction to Next Paint', key: 'INTERACTION_TO_NEXT_PAINT' },
    { metric: 'Largest Contentful Paint', key: 'LARGEST_CONTENTFUL_PAINT_MS' },
  ] as const;

  return (
    <AccordionItem value={title.toLowerCase().replace(/\s+/g, '-')}>
      <AccordionTrigger>
        <div className="text-lg font-bold">
          {title}: {category}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid-auto-rows-[1fr] mt-2 grid grid-cols-[repeat(auto-fill,_minmax(180px,_1fr))] gap-2">
          {metrics.map(({ metric, key }) => {
            const mobileMetric = experienceMobile?.metrics[key];
            const desktopMetric = experienceDesktop?.metrics[key];
            return (
              <div key={key} className="flex flex-col gap-2">
                {mobileMetric && desktopMetric ? ( <h4 className="text-sm font-bold">{metric}</h4>) : null}
                {mobileMetric ? (
                  <HorizontalGaugeChart
                    metric={`${mobileMetric.percentile} - ${mobileMetric.category} - Mobile`}
                    data={mobileMetric}
                  />
                ) : null}
                  {desktopMetric ? (
                  <HorizontalGaugeChart
                    metric={`${desktopMetric.percentile} - ${desktopMetric.category} - Desktop`}
                    data={desktopMetric}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
