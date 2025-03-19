import { HorizontalGaugeChart } from '@/components/common/PageSpeedGaugeChart';
import { PageSpeedApiLoadingExperience } from '@/lib/schema';
import { Details } from '@/components/ui/accordion';
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
    <>
      <Details className="&:not([open])]:none flex flex-col gap-2 print:border-0">
        <summary className="flex flex-col gap-2">
          <div className="text-lg font-bold group-hover:underline">
            {title}:{' '}
            {experienceMobile?.overall_category
              ? `Mobile -  ${experienceMobile?.overall_category} `
              : ''}{' '}
            {experienceDesktop?.overall_category
              ? `Desktop - ${experienceDesktop?.overall_category}`
              : ''}
          </div>
        </summary>
        <div className="-mx-2 grid max-w-full grid-cols-[repeat(auto-fit,_minmax(14rem,_1fr))] gap-2">
          {metrics.map(({ metric, key }) => {
            const mobileMetric = experienceMobile?.metrics[key];
            const desktopMetric = experienceDesktop?.metrics[key];
            return (
              <Card
                key={key}
                className="flex w-full min-w-64 flex-col gap-2 px-4 py-4"
              >
                {mobileMetric && desktopMetric ? (
                  <CardTitle className="text-sm font-bold">{metric}</CardTitle>
                ) : null}
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
      </Details>
      <div className="screen:hidden print:break-before-page"></div>
    </>
  );
}
