"use client";
import type { ReactNode } from "react";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { useIsEmbeddedDetails } from "@/features/page-speed-insights/lh-categories/EmbeddedDetails";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";

/**
 * Titled accordion section around a detail table. When embedded (see `EmbeddedDetails`),
 * the parent already supplies a title, so the children render bare.
 */
export function DetailTableSection({
  title,
  titleClassName,
  children,
}: {
  title: string;
  titleClassName?: string;
  children: ReactNode;
}) {
  if (useIsEmbeddedDetails()) return <>{children}</>;

  return (
    <AccordionItem value={title}>
      <AccordionSectionTitleTrigger titleClassName={titleClassName}>
        {toTitleCase(title)}
      </AccordionSectionTitleTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}
