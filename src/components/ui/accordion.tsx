'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn('border-b', className)}
    {...props}
  />
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 items-center justify-between py-4 text-left text-sm font-medium transition-all group disabled:hover:no-underline [&[data-state=open]>svg]:rotate-180 [&[disabled]>svg]:hidden hover:bg-muted hover:cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

export const AccordionTriggerSubgrid = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="contents relative">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'grid grid-cols-subgrid col-span-full border-b-2 items-center justify-between py-4 text-left text-sm font-medium transition-all group disabled:hover:no-underline [&[data-state=open]>svg]:rotate-180 [&[disabled]>svg]:hidden hover:bg-muted hover:cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </AccordionPrimitive.Trigger>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 inline-block -col-start-1 -col-end-1 self-center" />
  </AccordionPrimitive.Header>
));
AccordionTriggerSubgrid.displayName = AccordionPrimitive.Trigger.displayName;


const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;


export const AccordionContentSubgrid = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm  grid grid-cols-subgrid col-span-full"
    {...props}
    //data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down
  >
    <div className={cn('pb-4 pt-0', className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContentSubgrid.displayName = AccordionPrimitive.Content.displayName;


export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
