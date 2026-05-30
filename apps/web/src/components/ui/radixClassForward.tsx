"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Radix (or any) component + `cn(base, className)` forwardRef wrapper.
 * Cuts duplicated forwardRef blocks across dialog / tabs / select / menus.
 */
export function radixClassForward<E extends React.ElementType>(
  Element: E,
  baseClass: string,
) {
  const Comp = React.forwardRef<
    React.ComponentRef<E>,
    React.ComponentPropsWithoutRef<E> & { className?: string }
  >(({ className, ...props }, ref) =>
    React.createElement(Element, {
      ref,
      className: cn(baseClass, className),
      ...props,
    } as React.ComponentPropsWithRef<E>),
  );
  const dn = (Element as { displayName?: string }).displayName;
  if (dn) Comp.displayName = dn;
  return Comp;
}
