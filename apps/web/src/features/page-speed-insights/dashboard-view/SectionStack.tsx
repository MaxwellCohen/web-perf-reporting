"use client";

import type { ReactNode } from "react";
import { Accordion } from "@/components/ui/accordion";

export function SectionStack({
  defaultOpen,
  children,
}: {
  defaultOpen: string[];
  children: ReactNode;
}) {
  return (
    <Accordion type="multiple" defaultValue={defaultOpen}>
      {children}
    </Accordion>
  );
}
