"use client";

import { useState } from "react";
import { Treemap } from "recharts";
import { ClientOnly } from "@/components/common/ClientOnly";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { chartConfig } from "@/components/common/ChartSettings";
import { formatBytes } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import {
  buildTreemapChartNodes,
  copyTreemapNodeName,
  getTreemapDisplayLabel,
  getTreemapLabel,
  getTreemapNodeColor,
  type TreemapChartNode,
} from "@/features/page-speed-insights/script-treemap/treemapChartData";
import type { TreeMapData } from "@/lib/schema";

type TreemapNodeChild = {
  name?: string;
};

type TreemapContentProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  fullName?: string;
  depth?: number;
  index?: number;
  resourceBytes?: number;
  unusedBytes?: number;
  /** Nested treemap nodes from Recharts (not React children). */
  children?: TreemapNodeChild[] | null;
  onCopyName?: (name: string) => void;
};

function isLeafNode(children: TreemapContentProps["children"]): boolean {
  return !Array.isArray(children) || children.length === 0;
}

function TreemapTile({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = "",
  fullName,
  depth = 0,
  resourceBytes = 0,
  unusedBytes,
  children,
  onCopyName,
}: TreemapContentProps) {
  if (width <= 0 || height <= 0 || depth === 0 || !isLeafNode(children)) {
    return null;
  }

  const scriptName = fullName || name;
  const fill = getTreemapNodeColor(resourceBytes, unusedBytes);
  const canCopy = Boolean(scriptName);
  const clipId = `treemap-clip-${name}`;

  const showLabel = width > 72 && height > 30;
  const maxChars = Math.max(8, Math.floor((width - 16) / 7.2));
  const label = showLabel ? getTreemapDisplayLabel(scriptName, maxChars).primary : "";

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} rx={3} ry={3} />
        </clipPath>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={1}
        rx={3}
        style={{ cursor: canCopy ? "pointer" : undefined }}
        onDoubleClick={
          canCopy
            ? (event) => {
                event.stopPropagation();
                onCopyName?.(scriptName);
              }
            : undefined
        }
      >
        {canCopy ? <title>{`${scriptName}\nDouble-click to copy`}</title> : null}
      </rect>
      {showLabel ? (
        <g clipPath={`url(#${clipId})`} pointerEvents="none">
          <text
            x={x + 8}
            y={y + 16}
            fill="#000"
            fontSize={12}
            fontWeight={400}
            style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          >
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

function TreemapTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: TreemapChartNode }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const node = payload[0]?.payload;
  if (!node || (Array.isArray(node.children) && node.children.length > 0)) {
    return null;
  }

  const unusedPercent =
    node.unusedBytes !== undefined
      ? `${((node.unusedBytes / node.resourceBytes) * 100).toFixed(1)}%`
      : null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <div className="max-w-xs break-all font-medium">{node.fullName ?? node.name}</div>
      <div className="text-muted-foreground">Size: {formatBytes(node.resourceBytes)}</div>
      {node.unusedBytes !== undefined ? (
        <div className="text-muted-foreground">
          Unused: {formatBytes(node.unusedBytes)} ({unusedPercent})
        </div>
      ) : null}
      <div className="text-muted-foreground">Double-click to copy URL</div>
    </div>
  );
}

export function ScriptTreemapChartCard({
  treeData,
  label,
}: {
  treeData: TreeMapData;
  label?: string;
}) {
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const chartData = buildTreemapChartNodes(treeData.nodes);

  const handleCopyName = async (name: string) => {
    const copied = await copyTreemapNodeName(name);
    if (!copied) {
      return;
    }

    setCopiedName(name);
    window.setTimeout(() => {
      setCopiedName((current) => (current === name ? null : current));
    }, 2000);
  };

  if (!chartData.length) {
    return null;
  }

  const title = label ? `Script Treemap (${label})` : "Script Treemap";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Double-click a tile to copy its URL or script name.</CardDescription>
        {copiedName ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            Copied: {getTreemapLabel(copiedName, 80)}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <ClientOnly>
          <ChartContainer config={chartConfig} className="h-110 w-full">
            <Treemap
              data={chartData}
              dataKey="size"
              nameKey="name"
              stroke="hsl(var(--background))"
              nodeGap={3}
              content={<TreemapTile onCopyName={handleCopyName} />}
              isAnimationActive={false}
            >
              <ChartTooltip content={<TreemapTooltipContent />} />
            </Treemap>
          </ChartContainer>
        </ClientOnly>
      </CardContent>
    </Card>
  );
}
