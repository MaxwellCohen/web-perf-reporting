import * as React from "react";

import { cn } from "@/lib/cn";

export function withDisplayName<T extends { displayName?: string }>(component: T, displayName: string): T {
  component.displayName = displayName;
  return component;
}

export function tableElementProps<R, P extends object>(
  defaultClass: string,
  className: string | undefined,
  ref: React.ForwardedRef<R>,
  props: P,
) {
  return {
    ref,
    className: cn(defaultClass, className),
    suppressHydrationWarning: true,
    ...props,
  } as P & {
    ref: React.ForwardedRef<R>;
    className: string;
    suppressHydrationWarning: true;
  };
}

export function forwardTableDiv(displayName: string, role: React.AriaRole, defaultClass: string) {
  const Comp = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={cn(defaultClass, className)} role={role} {...props} />
    ),
  );
  Comp.displayName = displayName;
  return Comp;
}
