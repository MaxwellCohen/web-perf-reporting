"use client";

import { NodeComponent } from "@/features/page-speed-insights/lh-categories/table/RenderNode";
import { TableCardShell } from "@/features/page-speed-insights/shared/TableCard";
import type { LcpElement } from "@/features/page-speed-insights/lcpElement";

export function LcpElementSummary({ elements }: { elements: LcpElement[] }) {
  if (!elements.length) return null;

  return (
    <div data-testid="lcp-element" className="md:col-span-2 lg:col-span-3">
      <TableCardShell title="LCP element">
        <div className="space-y-4">
          {elements.map(({ label, node }) => (
            <div
              key={`${label}:${node.lhId ?? node.selector ?? node.nodeLabel}`}
              className="min-w-0 space-y-1"
            >
              {elements.length > 1 ? (
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
              ) : null}
              <NodeComponent item={node} device={label} />
            </div>
          ))}
        </div>
      </TableCardShell>
    </div>
  );
}
