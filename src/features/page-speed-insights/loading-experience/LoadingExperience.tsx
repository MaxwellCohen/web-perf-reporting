import { HorizontalGaugeChart } from "@/components/common/PageSpeedGaugeChart";
import { AccordionItem, AccordionContent } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { Fragment } from "react";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { Card, CardTitle } from "@/components/ui/card";

interface LoadingExperienceProps {
  title: string;
  experienceKey: "loadingExperience" | "originLoadingExperience";
}

const metrics = [
  { metric: "First Contentful Paint", key: "FIRST_CONTENTFUL_PAINT_MS" },
  { metric: "Largest Contentful Paint", key: "LARGEST_CONTENTFUL_PAINT_MS" },
  { metric: "Cumulative Layout Shift", key: "CUMULATIVE_LAYOUT_SHIFT_SCORE" },
  { metric: "Time to First Byte", key: "EXPERIMENTAL_TIME_TO_FIRST_BYTE" },
  { metric: "Interaction to Next Paint", key: "INTERACTION_TO_NEXT_PAINT" },
] as const;

export function LoadingExperience({ title, experienceKey }: LoadingExperienceProps) {
  const items = usePageSpeedItems();
  if (!items.length) {
    return null;
  }
  const experiences = items
    .filter(({ item }) => item[experienceKey])
    .map(({ item, label }) => ({ item: item[experienceKey], label }));

  if (!experiences.length) {
    return null;
  }

  const extraTitle = experiences
    ?.map((experience) => {
      return `${experience.label ? `${experience.label} - ` : ""}${experience?.item?.overall_category}`;
    })
    .join(" \n");

  if (!extraTitle) return null;

  return (
    <>
      <AccordionItem value={experienceKey}>
        <AccordionSectionTitleTrigger>
          {title}: {extraTitle}
        </AccordionSectionTitleTrigger>
        <AccordionContent className="-mx-2 grid max-w-full grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-2">
          {metrics.map(({ metric, key }) => {
            return (
              <Card key={key} className="flex w-full min-w-64 flex-col gap-2 px-4 py-4">
                <CardTitle className="text-sm font-bold">{metric}</CardTitle>
                {experiences.map((experience, idx) => {
                  const metricValue = experience?.item?.metrics?.[key];
                  if (!metricValue) {
                    return null;
                  }
                  return (
                    <Fragment key={`${key}_${idx}`}>
                      {!metricValue ? null : (
                        <HorizontalGaugeChart
                          key={key}
                          metric={`${metricValue.percentile} - ${metricValue.category} ${experience.label ? `(${experience.label})` : ""}`}
                          data={metricValue}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </Card>
            );
          })}
        </AccordionContent>
      </AccordionItem>
      <div className="screen:hidden print:break-before-page"></div>
    </>
  );
}
