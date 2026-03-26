"use client";

import * as React from "react";
import { AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const accordionSectionTitleClassName = "text-lg font-bold group-hover:underline";

export type AccordionSectionTitleTriggerProps = Omit<
  React.ComponentPropsWithoutRef<typeof AccordionTrigger>,
  "children"
> & {
  /** Additional classes merged onto the inner title element */
  titleClassName?: string;
  children: React.ReactNode;
};

export const AccordionSectionTitleTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionTrigger>,
  AccordionSectionTitleTriggerProps
>(({ className, titleClassName, children, ...props }, ref) => (
  <AccordionTrigger ref={ref} className={className} {...props}>
    <div className={cn(accordionSectionTitleClassName, titleClassName)}>{children}</div>
  </AccordionTrigger>
));
AccordionSectionTitleTrigger.displayName = "AccordionSectionTitleTrigger";
