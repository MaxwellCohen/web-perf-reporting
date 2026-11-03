"use client";

import { Fragment, useId, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const UNATTRIBUTED_LABEL = "Unattributed";

const UNATTRIBUTED_HINT =
  "Lighthouse recorded this long task on the main thread but did not attribute it to a script URL. The work is often browser parsing, style, or layout, an inline script, or a task the trace could not tie to a file.";

export function UnattributedLabel() {
  const descriptionId = `unattributed-hint-${useId()}`;
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline cursor-help border-0 bg-transparent p-0 font-[inherit] text-[length:inherit] leading-[inherit] text-inherit underline decoration-dotted decoration-current/60 underline-offset-2"
          aria-describedby={descriptionId}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          {UNATTRIBUTED_LABEL}
        </button>
      </PopoverTrigger>
      <span id={descriptionId} className="sr-only">
        {UNATTRIBUTED_HINT}
      </span>
      <PopoverContent
        side="top"
        align="start"
        role="tooltip"
        className="w-64 p-3 text-xs font-normal leading-relaxed"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {UNATTRIBUTED_HINT}
      </PopoverContent>
    </Popover>
  );
}

export function textWithUnattributedHint(text: string) {
  if (!text.includes(UNATTRIBUTED_LABEL)) return text;
  const parts = text.split(UNATTRIBUTED_LABEL);
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 ? <UnattributedLabel /> : null}
    </Fragment>
  ));
}
