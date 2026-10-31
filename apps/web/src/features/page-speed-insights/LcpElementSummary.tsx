"use client";

import { NodeComponent } from "@/features/page-speed-insights/lh-categories/table/RenderNode";
import { CompareRunsCard } from "@/features/page-speed-insights/shared/CompareRunsCard";
import type { LcpElement } from "@/features/page-speed-insights/lcpElement";

function LcpElementBlock({ element, showLabel }: { element: LcpElement; showLabel: boolean }) {
  const { label, node } = element;
  return (
    <div className="min-w-0 space-y-1">
      {showLabel ? <p className="text-xs font-medium text-muted-foreground">{label}</p> : null}
      <NodeComponent item={node} device={label} />
    </div>
  );
}

export function LcpElementSummary({ elements }: { elements: LcpElement[] }) {
  return (
    <CompareRunsCard
      items={elements}
      testId="lcp-element"
      title="LCP element"
      singleClassName="space-y-4"
      compareKey={(element) => `${element.label}:${element.node.lhId ?? element.node.selector}`}
      singleKey={(element) =>
        `${element.label}:${element.node.lhId ?? element.node.selector ?? element.node.nodeLabel}`
      }
      renderItem={(element, showLabel) => (
        <LcpElementBlock element={element} showLabel={showLabel} />
      )}
    />
  );
}
