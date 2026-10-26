"use client";

import { NodeComponent } from "@/features/page-speed-insights/lh-categories/table/RenderNode";
import { TableCardShell } from "@/features/page-speed-insights/shared/TableCard";
import type { LcpElement } from "@/features/page-speed-insights/lcpElement";
import {
  getCompareRuns,
  pairByFormFactor,
} from "@/features/page-speed-insights/shared/compareRuns";

function LcpElementBlock({
  element,
  showLabel,
}: {
  element: LcpElement;
  showLabel: boolean;
}) {
  const { label, node } = element;
  return (
    <div className="min-w-0 space-y-1">
      {showLabel ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
      <NodeComponent item={node} device={label} />
    </div>
  );
}

export function LcpElementSummary({ elements }: { elements: LcpElement[] }) {
  if (!elements.length) return null;

  const compare = getCompareRuns(elements);

  if (compare.mode === "compare") {
    const pairs = pairByFormFactor(elements, compare.runs);
    return (
      <div data-testid="lcp-element" className="md:col-span-2 lg:col-span-3">
        <TableCardShell title="LCP element">
          <div className="flex flex-col gap-4" data-testid="lcp-element-compare">
            {pairs.map((pair) => {
              const runElements = [pair.a, pair.b].filter(Boolean) as LcpElement[];
              if (!runElements.length) return null;
              return (
                <div key={pair.formFactor} className="min-w-0 space-y-2">
                  <p className="text-sm font-semibold">{pair.formFactor}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {runElements.map((element) => (
                      <LcpElementBlock
                        key={`${element.label}:${element.node.lhId ?? element.node.selector}`}
                        element={element}
                        showLabel
                      />
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
    <div data-testid="lcp-element" className="md:col-span-2 lg:col-span-3">
      <TableCardShell title="LCP element">
        <div className="space-y-4">
          {elements.map((element) => (
            <LcpElementBlock
              key={`${element.label}:${element.node.lhId ?? element.node.selector ?? element.node.nodeLabel}`}
              element={element}
              showLabel={elements.length > 1}
            />
          ))}
        </div>
      </TableCardShell>
    </div>
  );
}
