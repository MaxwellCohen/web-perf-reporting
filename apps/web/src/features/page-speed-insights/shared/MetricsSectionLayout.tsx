"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const sectionGridClassName = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";

export const fullWidthClassName = "md:col-span-2 lg:col-span-3";

export function SectionGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(sectionGridClassName, className)}>{children}</div>;
}

export function FullWidthRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(fullWidthClassName, className)}>{children}</div>;
}

export function ChartTableStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}

export function TwoColumnRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid w-full grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-3", className)}>
      {children}
    </div>
  );
}
