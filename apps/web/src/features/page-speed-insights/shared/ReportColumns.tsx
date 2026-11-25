import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The one heading style for a block of data that belongs to a single report (Mobile, Desktop, …). */
export function ReportHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("text-xs font-medium tracking-wide text-muted-foreground uppercase", className)}
      data-testid="report-heading"
    >
      {children}
    </p>
  );
}

/**
 * The one layout for per-report blocks: side by side on a wide screen, stacked on a phone.
 * A single report takes the full width. Pass `count` when some children may render nothing.
 */
export function ReportColumns({
  children,
  count,
  className,
  testId,
}: {
  children: ReactNode;
  count?: number;
  className?: string;
  testId?: string;
}) {
  const columns = count ?? Children.toArray(children).length;
  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-1 items-start gap-4",
        columns > 1 && "lg:grid-cols-2",
        className,
      )}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

/** One report's block inside `ReportColumns`. The heading is hidden when there is only one report. */
export function ReportColumn({
  label,
  showLabel = true,
  meta,
  children,
  className,
  testId,
}: {
  label: string;
  showLabel?: boolean;
  /** Short note after the label, e.g. "3 items". */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <section aria-label={label} className={cn("min-w-0 space-y-2", className)} data-testid={testId}>
      {showLabel ? (
        <ReportHeading>
          {label}
          {meta ? (
            <span className="ml-2 font-normal tracking-normal normal-case">{meta}</span>
          ) : null}
        </ReportHeading>
      ) : null}
      {children}
    </section>
  );
}
