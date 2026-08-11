"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

type WithCopyToolbarProps<T extends HTMLElement> = {
  className?: string;
  renderButton: (elementRef: RefObject<T | null>) => ReactNode;
  children: (elementRef: RefObject<T | null>) => ReactNode;
};

/** Shared copy-toolbar chrome for HTML tables and CSS-grid tables. */
export function WithCopyToolbar<T extends HTMLElement>({
  className,
  renderButton,
  children,
}: WithCopyToolbarProps<T>) {
  const elementRef = useRef<T | null>(null);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex justify-end">{renderButton(elementRef)}</div>
      {children(elementRef)}
    </div>
  );
}
