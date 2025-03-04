import { HorizontalGaugeChart } from '@/components/common/PageSpeedGaugeChart';
import { PageSpeedApiLoadingExperience } from '@/lib/schema';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useId } from 'react';

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
    const id = useId();
  if (!experienceDesktop && !experienceMobile) return null;

  const metrics = [
    { metric: 'Cumulative Layout Shift', key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE' },
    { metric: 'Time to First Byte', key: 'EXPERIMENTAL_TIME_TO_FIRST_BYTE' },
    { metric: 'First Contentful Paint', key: 'FIRST_CONTENTFUL_PAINT_MS' },
    { metric: 'Interaction to Next Paint', key: 'INTERACTION_TO_NEXT_PAINT' },
    { metric: 'Largest Contentful Paint', key: 'LARGEST_CONTENTFUL_PAINT_MS' },
  ] as const;

  return (
    <AccordionItem value={title.toLowerCase().replace(/\s+/g, '-') + id}>
      <AccordionTrigger>
        <div className="text-lg font-bold">
          {title}: {category}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid-auto-rows-[1fr] mt-2 grid grid-cols-[repeat(auto-fill,_minmax(180px,_1fr))] gap-2">
          {metrics.map(({ metric, key }) => {
            return (
              <div key={key + id} className="flex flex-col gap-2">
                {experienceMobile?.metrics[key] && experienceDesktop?.metrics[key] ? ( <h4 className="text-sm font-bold">{metric}</h4>) : null}
                {experienceMobile?.metrics[key] ? (
                  <HorizontalGaugeChart
                    metric={`${experienceMobile?.metrics[key].percentile} - ${experienceMobile?.metrics[key].category} - Mobile`}
                    data={experienceMobile?.metrics[key]}
                  />
                ) : null}
                {experienceDesktop?.metrics[key] ? (
                  <HorizontalGaugeChart
                    metric={`${experienceDesktop?.metrics[key].percentile} - ${experienceDesktop?.metrics[key].category} - Desktop`}
                    data={experienceDesktop?.metrics[key]}
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
