"use client";

import { getNetworkBarColor } from "@/features/page-speed-insights/shared/networkResourceColors";
import { formatBytes } from "@/features/page-speed-insights/shared/format";
import type { WeightNode } from "@/features/page-speed-insights/dashboard-view/resources-story/resourcesInvestigationModel";
import { toTitleCase } from "@/features/page-speed-insights/toTitleCase";
import { cn } from "@/lib/cn";

type TypeGroup = {
  resourceType: string;
  transferSize: number;
  nodes: WeightNode[];
};

function groupNodes(nodes: WeightNode[]): TypeGroup[] {
  const groups = new Map<string, TypeGroup>();
  for (const node of nodes) {
    const group = groups.get(node.resourceType) ?? {
      resourceType: node.resourceType,
      transferSize: 0,
      nodes: [],
    };
    group.transferSize += node.transferSize;
    group.nodes.push(node);
    groups.set(node.resourceType, group);
  }
  return [...groups.values()].sort((left, right) => right.transferSize - left.transferSize);
}

export function TransferWeightMap({
  nodes,
  emphasizeUnused,
  selectedUrl,
  onSelect,
}: {
  nodes: WeightNode[];
  emphasizeUnused: boolean;
  selectedUrl: string | null;
  onSelect: (url: string) => void;
}) {
  const groups = groupNodes(nodes);
  if (!groups.length) {
    return <p className="text-sm text-muted-foreground">No per-URL sizes were recorded.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Where the bytes live
        </p>
        <p className="text-xs text-muted-foreground">
          {emphasizeUnused
            ? "Size is transfer. The dark band is unused JavaScript."
            : "Size is transfer."}
        </p>
      </div>
      <div className="flex h-72 gap-1" aria-label="Transfer weight map">
        {groups.map((group) => (
          <div
            key={group.resourceType}
            className="flex min-w-10 flex-col gap-1"
            style={{ flexGrow: group.transferSize, flexBasis: 0 }}
          >
            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {toTitleCase(group.resourceType)}
            </p>
            <div className="flex min-h-0 flex-1 flex-col gap-1">
              {group.nodes.map((node) => {
                const selected = node.url !== "" && node.url === selectedUrl;
                const unusedWidth =
                  emphasizeUnused && node.unusedShare != null ? `${node.unusedShare * 100}%` : "0%";
                const body = (
                  <>
                    <span
                      className="pointer-events-none absolute inset-y-0 left-0 bg-rose-950/45"
                      style={{ width: unusedWidth }}
                      aria-hidden
                    />
                    <span className="relative line-clamp-2 text-[11px] leading-tight text-black/80">
                      {node.label}
                    </span>
                  </>
                );
                const className = cn(
                  "relative flex min-h-6 overflow-hidden rounded-sm px-1.5 py-1 text-left",
                  getNetworkBarColor(node.resourceType),
                  selected && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                );
                if (node.aggregate || !node.url) {
                  return (
                    <div
                      key={node.id}
                      className={className}
                      style={{ flexGrow: node.transferSize, flexBasis: 0 }}
                      title={`${node.label} · ${formatBytes(node.transferSize)}`}
                    >
                      {body}
                    </div>
                  );
                }
                return (
                  <button
                    key={node.id}
                    type="button"
                    aria-pressed={selected}
                    className={className}
                    style={{ flexGrow: node.transferSize, flexBasis: 0 }}
                    title={`${node.url} · ${formatBytes(node.transferSize)}`}
                    onClick={() => onSelect(node.url)}
                  >
                    {body}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
