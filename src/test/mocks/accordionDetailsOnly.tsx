import type { HTMLAttributes } from "react";

/** Accordion mock: only `Details` (historical dashboard tests). */
export function Details({
  children,
  ...props
}: HTMLAttributes<HTMLDetailsElement>) {
  return (
    <details open {...props}>
      {children}
    </details>
  );
}
