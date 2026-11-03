import * as React from "react";

import { cn } from "@/lib/cn";

export function withDisplayName<T extends { displayName?: string }>(
  component: T,
  displayName: string,
): T {
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
