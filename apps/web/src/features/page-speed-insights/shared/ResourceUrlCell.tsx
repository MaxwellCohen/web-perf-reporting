"use client";

import { ExternalLink } from "lucide-react";
import { parseUrlForDisplay } from "@/lib/urlDisplay";
import { cn } from "@/lib/utils";

type ResourceUrlParts = {
  primary: string;
  secondary: string;
};

function getResourceUrlParts(url: string): ResourceUrlParts {
  const parsed = parseUrlForDisplay(url);
  if (!parsed) {
    return { primary: url, secondary: "" };
  }

  if (!parsed.hostLabel) {
    return { primary: parsed.path, secondary: "" };
  }

  const segments = parsed.path.split("/").filter(Boolean);
  const filename = segments.at(-1);
  if (!filename) {
    return { primary: parsed.path, secondary: parsed.hostname };
  }

  const directory =
    segments.length > 1 ? `/${segments.slice(0, -1).join("/")}/` : "/";

  return {
    primary: filename,
    secondary: `${parsed.hostname}${directory}`,
  };
}

type ResourceUrlCellProps = {
  url: string;
  className?: string;
};

/**
 * Compact resource URL for data tables: filename on top, host + path muted below.
 * Full URL stays in the title tooltip and link href.
 */
export function ResourceUrlCell({ url, className }: ResourceUrlCellProps) {
  const { primary, secondary } = getResourceUrlParts(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={cn(
        "group grid min-w-0 gap-0.5 rounded-sm py-0.5 outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate font-mono text-xs font-medium text-foreground group-hover:underline">
          {primary}
        </span>
        <ExternalLink
          aria-hidden
          className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-70 group-focus-visible:opacity-70"
        />
      </span>
      {secondary ? (
        <span className="min-w-0 truncate text-[11px] leading-tight text-muted-foreground">
          {secondary}
        </span>
      ) : null}
    </a>
  );
}
