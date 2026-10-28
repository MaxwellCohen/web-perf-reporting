"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import { CopyButton } from "@/components/ui/copy-button";
import {
  buildSpeedUpPrompt,
  SPEED_UP_PROMPT_SOURCE,
} from "@/features/page-speed-insights/dashboard-view/speedUpPrompt";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";

export function SpeedUpPromptSection() {
  const items = usePageSpeedItems();
  const prompt = useMemo(() => buildSpeedUpPrompt(items), [items]);

  if (items.length === 0) return null;

  return (
    <AccordionItem value="speedUpPrompt">
      <AccordionSectionTitleTrigger>Speed-up prompt</AccordionSectionTitleTrigger>
      <AccordionContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            A framework-agnostic prompt for an AI coding assistant, built from this report&apos;s
            findings. Playbook adapted from{" "}
            <a
              href={SPEED_UP_PROMPT_SOURCE}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Optimizing TanStack Start
            </a>
            .
          </p>
          <CopyButton text={prompt.text} size="sm" className="gap-2" aria-label="Copy prompt">
            Copy prompt
          </CopyButton>
        </div>
        {prompt.focusAreas.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" aria-label="Focus areas">
            <span className="text-xs text-muted-foreground">Focus areas:</span>
            {prompt.focusAreas.map((area) => (
              <Badge key={area.id} variant="secondary">
                {area.title}
              </Badge>
            ))}
          </div>
        ) : null}
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-4 font-mono text-xs">
          {prompt.text}
        </pre>
      </AccordionContent>
    </AccordionItem>
  );
}
