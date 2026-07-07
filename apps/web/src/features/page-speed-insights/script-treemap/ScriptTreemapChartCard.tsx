"use client";

import { useCallback, useMemo, useState } from "react";
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
  onCopyName?: (name: string) => void;
};

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
  onCopyName,
}: TreemapContentProps) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const scriptName = fullName || name;
  const fill = getTreemapNodeColor(resourceBytes, unusedBytes);
  const showLabel = width > 48 && height > 24 && depth > 0;
  const maxChars = Math.max(12, Math.floor(width / 5.5));
  const displayLabel = getTreemapDisplayLabel(scriptName, maxChars);
  const showTwoLines = showLabel && Boolean(displayLabel.secondary) && height > 38;
  const canCopy = Boolean(scriptName && depth > 0);

  const labelStyle = {
    fill: "hsl(var(--primary-foreground))",
    paintOrder: "stroke" as const,
    stroke: "rgba(0, 0, 0, 0.45)",
    strokeWidth: 2,
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={2}
        rx={2}
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
        showTwoLines ? (
          <>
            <text
              x={x + 6}
              y={y + 15}
              fontSize={11}
              fontWeight={600}
              pointerEvents="none"
              {...labelStyle}
            >
              {displayLabel.primary}
            </text>
            <text
              x={x + 6}
              y={y + 28}
              fontSize={9}
              opacity={0.9}
              pointerEvents="none"
              {...labelStyle}
            >
              {displayLabel.secondary}
            </text>
          </>
        ) : (
          <text
            x={x + 6}
            y={y + 16}
            fontSize={11}
            fontWeight={600}
            pointerEvents="none"
            {...labelStyle}
          >
            {displayLabel.primary}
          </text>
        )
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
  if (!node) {
    return null;
  }

  const unusedPercent =
    node.unusedBytes !== undefined
      ? `${((node.unusedBytes / node.resourceBytes) * 100).toFixed(1)}%`
      : null;

  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <div className="max-w-xs truncate font-medium">{node.fullName ?? node.name}</div>
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

  const chartData = useMemo(() => buildTreemapChartNodes(treeData.nodes), [treeData]);

  const handleCopyName = useCallback(async (name: string) => {
    const copied = await copyTreemapNodeName(name);
    if (!copied) {
      return;
    }

    setCopiedName(name);
    window.setTimeout(() => {
      setCopiedName((current) => (current === name ? null : current));
    }, 2000);
  }, []);

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
