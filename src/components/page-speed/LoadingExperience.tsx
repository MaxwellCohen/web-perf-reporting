import { HorizontalGaugeChart } from '@/components/common/PageSpeedGaugeChart';
import { PageSpeedApiLoadingExperience } from '@/lib/schema';
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { Card, CardTitle } from '../ui/card';

interface LoadingExperienceProps {
  title: string;
  experienceDesktop?: PageSpeedApiLoadingExperience;
  experienceMobile?: PageSpeedApiLoadingExperience;
}

export function LoadingExperience({
  title,
  experienceDesktop,
  experienceMobile,
}: LoadingExperienceProps) {
  if (!experienceDesktop && !experienceMobile) return null;

  const metrics = [
    { metric: 'First Contentful Paint', key: 'FIRST_CONTENTFUL_PAINT_MS' },
    { metric: 'Largest Contentful Paint', key: 'LARGEST_CONTENTFUL_PAINT_MS' },
    { metric: 'Cumulative Layout Shift', key: 'CUMULATIVE_LAYOUT_SHIFT_SCORE' },
    { metric: 'Time to First Byte', key: 'EXPERIMENTAL_TIME_TO_FIRST_BYTE' },
    { metric: 'Interaction to Next Paint', key: 'INTERACTION_TO_NEXT_PAINT' },
  ] as const;
  return (
    <AccordionItem value={title.toLowerCase().replace(/\s+/g, '-')} className="print:border-0" defaultValue={title.toLowerCase().replace(/\s+/g, '-')}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">
          {title}: {experienceMobile?.overall_category ? `Mobile -  ${experienceMobile?.overall_category} ` : ''} {experienceDesktop?.overall_category ? `Desktop - ${experienceDesktop?.overall_category}` : ''}
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-[repeat(auto-fill,_minmax(14rem,_1fr))] gap-2">
          {metrics.map(({ metric, key }) => {
            const mobileMetric = experienceMobile?.metrics[key];
            const desktopMetric = experienceDesktop?.metrics[key];
            return (
              <Card key={key} className="w-full min-w-64 px-4 py-4 flex flex-col gap-2">
                {mobileMetric && desktopMetric ? ( <CardTitle className="text-sm font-bold">{metric}</CardTitle>) : null}
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
              </Card>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
