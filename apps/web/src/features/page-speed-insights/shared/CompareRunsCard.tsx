"use client";

import { Fragment, type ReactNode } from "react";
import { TableCardShell } from "@/features/page-speed-insights/shared/TableCard";
import { getCompareRuns, pairByFormFactor } from "@/features/page-speed-insights/shared/compareRuns";

/** Card that lists one item per report, grouped by form factor when comparing two runs. */
export function CompareRunsCard<T extends { label: string }>({
  items,
  testId,
  title,
  singleClassName,
  compareKey,
  singleKey,
  renderItem,
}: {
  items: T[];
  testId: string;
  title: string;
  singleClassName: string;
  compareKey: (item: T) => string;
  singleKey: (item: T) => string;
  renderItem: (item: T, showLabel: boolean) => ReactNode;
}) {
  if (!items.length) return null;

  const compare = getCompareRuns(items);

  if (compare.mode === "compare") {
    const pairs = pairByFormFactor(items, compare.runs);
    return (
      <div data-testid={testId} className="md:col-span-2 lg:col-span-3">
        <TableCardShell title={title}>
          <div className="flex flex-col gap-4" data-testid={`${testId}-compare`}>
            {pairs.map((pair) => {
              const runItems = [pair.a, pair.b].filter(Boolean) as T[];
              if (!runItems.length) return null;
              return (
                <div key={pair.formFactor} className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold">{pair.formFactor}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {runItems.map((item) => (
                      <Fragment key={compareKey(item)}>{renderItem(item, true)}</Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TableCardShell>
      </div>
    );
  }

  return (
    <div data-testid={testId} className="md:col-span-2 lg:col-span-3">
      <TableCardShell title={title}>
        <div className={singleClassName}>
          {items.map((item) => (
            <Fragment key={singleKey(item)}>{renderItem(item, items.length > 1)}</Fragment>
          ))}
        </div>
      </TableCardShell>
    </div>
  );
}
