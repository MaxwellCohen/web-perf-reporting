"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type TreeMetric = {
  label: string;
  value: string;
};

interface TreeDataItem {
  id: string;
  name: string;
  icon?: React.ReactNode;
  selectedIcon?: React.ReactNode;
  openIcon?: React.ReactNode;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  droppable?: boolean;
  isRoot?: boolean;
  metrics?: TreeMetric[];
  /** Marks the longest request chain so it can be scanned without reading the label. */
  highlight?: boolean;
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  expandAll?: boolean;
  defaultNodeIcon?: React.ReactNode;
  defaultLeafIcon?: React.ReactNode;
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void;
};

type TreeLabelParts = {
  title: string;
  metrics: TreeMetric[];
  highlight: boolean;
};

const LONGEST_CHAIN_MARKER = "(Longest Chain)";

function splitLegacyName(name: string): TreeLabelParts {
  const highlight = name.includes(LONGEST_CHAIN_MARKER);
  const cleaned = name
    .replace(/\s*\|\s*\(Longest Chain\)\s*/g, "")
    .replace(LONGEST_CHAIN_MARKER, "")
    .trim();
  const parts = cleaned.split(" | ").filter(Boolean);
  const [title = cleaned, ...rest] = parts;

  const metrics = rest
    .map((part) => {
      const colon = part.indexOf(":");
      if (colon > 0) {
        return { label: part.slice(0, colon).trim(), value: part.slice(colon + 1).trim() };
      }
      const timed = part.match(/^(.+?)\s+(\d.*)$/);
      if (timed?.[1] && timed[2]) {
        return { label: timed[1].trim(), value: timed[2].trim() };
      }
      return { label: part.trim(), value: "" };
    })
    .filter((metric) => metric.label.length > 0 && metric.value.length > 0);

  return { title, metrics, highlight };
}

function getLabelParts(item: TreeDataItem): TreeLabelParts {
  if (item.metrics && item.metrics.length > 0) {
    return {
      title: item.name.replace(LONGEST_CHAIN_MARKER, "").trim(),
      metrics: item.metrics,
      highlight: Boolean(item.highlight) || item.name.includes(LONGEST_CHAIN_MARKER),
    };
  }
  const parsed = splitLegacyName(item.name);
  return {
    ...parsed,
    highlight: Boolean(item.highlight) || parsed.highlight,
  };
}

type ResourceDisplay = {
  primary: string;
  secondary: string;
  title: string;
  href?: string;
};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function describeResource(value: string): ResourceDisplay | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const query = url.search ? safeDecode(url.search) : "";

  if (segments.length === 0) {
    return {
      primary: url.host,
      secondary: query,
      title: value,
      href: value,
    };
  }

  if (segments.length === 1) {
    return {
      primary: `/${safeDecode(segments[0] ?? "")}`,
      secondary: `${url.host}${query}`,
      title: value,
      href: value,
    };
  }

  return {
    primary: safeDecode(segments.at(-1) ?? url.pathname),
    secondary: `${url.host}/${segments.slice(0, -1).join("/")}/${query}`,
    title: value,
    href: value,
  };
}

function TreeResourceName({ value }: { value: string }) {
  const display = describeResource(value);
  if (!display) {
    return <span className="font-mono text-[13px] leading-5 break-all text-foreground">{value}</span>;
  }

  const text = (
    <span className="block min-w-0" title={display.title}>
      <span className="font-mono text-[13px] leading-5 font-medium break-all text-foreground">
        {display.primary}
      </span>
      {display.secondary ? (
        <span className="mt-0.5 block truncate font-mono text-[11px] leading-4 text-zinc-400">
          {display.secondary}
        </span>
      ) : null}
    </span>
  );

  if (!display.href) {
    return text;
  }

  return (
    <a
      href={display.href}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline hover:underline"
    >
      {text}
    </a>
  );
}

function MetricChip({ metric }: { metric: TreeMetric }) {
  return (
    <span className="inline-flex items-baseline gap-1 rounded-sm bg-zinc-800/90 px-1.5 py-0.5 font-mono text-[10px] leading-4">
      <span className="tracking-wider text-zinc-500 uppercase">{metric.label}</span>
      <span className="text-zinc-100 tabular-nums">{metric.value}</span>
    </span>
  );
}

type TreeContextValue = {
  selectedItemId?: string;
  expandedIds: ReadonlySet<string>;
  onSelect: (item: TreeDataItem) => void;
  onDragStart: (item: TreeDataItem) => void;
  onDrop: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
};

const TreeContext = React.createContext<TreeContextValue | null>(null);

function useTreeContext() {
  const context = React.useContext(TreeContext);
  if (!context) {
    throw new Error("Tree rows must render inside TreeView");
  }
  return context;
}

function collectExpandedIds(data: TreeDataItem[] | TreeDataItem, expandAll?: boolean, initialSelectedItemId?: string) {
  if (expandAll) {
    const ids = new Set<string>();
    const collectAllIds = (items: TreeDataItem[] | TreeDataItem) => {
      if (items instanceof Array) {
        items.forEach((item) => {
          if (item.children) {
            ids.add(item.id);
            collectAllIds(item.children);
          }
        });
      } else if (items.children) {
        ids.add(items.id);
        collectAllIds(items.children);
      }
    };
    collectAllIds(data);
    return ids;
  }

  const ids = new Set<string>();
  if (!initialSelectedItemId) {
    return ids;
  }

  const walkTreeItems = (items: TreeDataItem[] | TreeDataItem, targetId: string): boolean => {
    if (items instanceof Array) {
      for (const item of items) {
        ids.add(item.id);
        if (walkTreeItems(item, targetId)) {
          return true;
        }
        ids.delete(item.id);
      }
      return false;
    }
    if (items.id === targetId) {
      return true;
    }
    if (items.children) {
      return walkTreeItems(items.children, targetId);
    }
    return false;
  };

  walkTreeItems(data, initialSelectedItemId);
  return ids;
}

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      expandAll,
      defaultLeafIcon: _defaultLeafIcon,
      defaultNodeIcon: _defaultNodeIcon,
      className,
      onDocumentDrag,
      ...props
    },
    ref,
  ) => {
    const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>(
      initialSelectedItemId,
    );
    const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(null);

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined) => {
        setSelectedItemId(item?.id);
        onSelectChange?.(item);
      },
      [onSelectChange],
    );

    const handleDragStart = React.useCallback((item: TreeDataItem) => {
      setDraggedItem(item);
    }, []);

    const handleDrop = React.useCallback(
      (targetItem: TreeDataItem) => {
        if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
          onDocumentDrag(draggedItem, targetItem);
        }
        setDraggedItem(null);
      },
      [draggedItem, onDocumentDrag],
    );

    const expandedIds = React.useMemo(
      () => collectExpandedIds(data, expandAll, initialSelectedItemId),
      [data, expandAll, initialSelectedItemId],
    );

    const items = data instanceof Array ? data : [data];

    const contextValue = React.useMemo<TreeContextValue>(
      () => ({
        selectedItemId,
        expandedIds,
        onSelect: handleSelectChange,
        onDragStart: handleDragStart,
        onDrop: handleDrop,
        draggedItem,
      }),
      [selectedItemId, expandedIds, handleSelectChange, handleDragStart, handleDrop, draggedItem],
    );

    return (
      <TreeContext.Provider value={contextValue}>
        <div ref={ref} className={cn("min-w-0", className)} {...props}>
          <TreeBranch items={items} depth={0} />
        </div>
      </TreeContext.Provider>
    );
  },
);
TreeView.displayName = "TreeView";

function TreeBranch({ items, depth }: { items: TreeDataItem[]; depth: number }) {
  return (
    <ul
      role={depth === 0 ? "tree" : "group"}
      className={cn(
        "m-0 list-none p-0",
        depth > 0 && "ml-2 border-l border-zinc-400",
      )}
    >
      {items.map((item, index) => (
        <TreeNode key={item.id} item={item} depth={depth} isLast={index === items.length - 1} />
      ))}
    </ul>
  );
}

function TreeNode({ item, depth, isLast }: { item: TreeDataItem; depth: number; isLast: boolean }) {
  const { expandedIds } = useTreeContext();
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isExpanded = hasChildren && expandedIds.has(item.id);

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} className="relative">
      {depth > 0 ? (
        <>
          <span aria-hidden className="absolute top-3.5 -left-px h-px w-1.75 bg-zinc-400" />
          {isLast ? (
            <span aria-hidden className="absolute top-3.75 -left-px bottom-0 w-px bg-background" />
          ) : null}
        </>
      ) : null}
      <div className={cn("min-w-0", depth > 0 && "pl-1.5")}>
        <TreeRow item={item} depth={depth} />
        {isExpanded && item.children ? <TreeBranch items={item.children} depth={depth + 1} /> : null}
      </div>
    </li>
  );
}

function TreeRow({ item, depth }: { item: TreeDataItem; depth: number }) {
  const { selectedItemId, onSelect, onDragStart, onDrop, draggedItem } = useTreeContext();
  const [isDragOver, setIsDragOver] = React.useState(false);
  const { title, metrics, highlight } = getLabelParts(item);
  const isSelected = selectedItemId === item.id;

  const onDragStartEvent = (event: React.DragEvent) => {
    if (!item.draggable) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", item.id);
    onDragStart(item);
  };

  const onDragOver = (event: React.DragEvent) => {
    if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
      event.preventDefault();
      setIsDragOver(true);
    }
  };

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-md py-1 pr-2",
        highlight ? "bg-red-950/40 ring-1 ring-red-400/40 ring-inset" : "hover:bg-zinc-800/70",
        isSelected && "ring-1 ring-zinc-300/70 ring-inset",
        isDragOver && "bg-primary/15",
      )}
      onClick={() => {
        onSelect(item);
        item.onClick?.();
      }}
      draggable={Boolean(item.draggable)}
      onDragStart={onDragStartEvent}
      onDragOver={onDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        onDrop(item);
      }}
    >
      {depth === 0 ? (
        <span aria-hidden className="mt-1.5 grid w-4 shrink-0 place-items-center">
          <span
            className={cn("size-1.5 rounded-full", highlight ? "bg-red-400" : "bg-zinc-300")}
          />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <TreeResourceName value={title} />
        </div>
        {metrics.length > 0 || highlight ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1">
            {metrics.map((metric) => (
              <MetricChip key={`${metric.label}-${metric.value}`} metric={metric} />
            ))}
            {highlight ? (
              <span className="inline-flex items-center rounded-sm bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-300 uppercase">
                Longest chain
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export { TreeView, type TreeDataItem };
