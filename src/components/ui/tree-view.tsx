/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Tree marker SVG components matching Lighthouse style
// Each marker is 12px wide (w-3 = 12px) and 26px tall
const TreeMarker = {
  horizDown: () => (
    <span 
      className="inline-block w-3 h-6.5 bg-no-repeat bg-top-left float-left"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg width='16' height='26' viewBox='0 0 16 26' xmlns='http://www.w3.org/2000/svg'><g fill='%23D8D8D8' fill-rule='evenodd'><path d='M16 12v2H-2v-2z'/><path d='M9 12v14H7V12z'/></g></svg>")`,
      }}
    />
  ),
  right: () => (
    <span 
      className="inline-block w-3 h-6.5 bg-no-repeat bg-top-left float-left"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg width='16' height='26' viewBox='0 0 16 26' xmlns='http://www.w3.org/2000/svg'><path d='M16 12v2H0v-2z' fill='%23D8D8D8' fill-rule='evenodd'/></svg>")`,
      }}
    />
  ),
  upRight: () => (
    <span 
      className="inline-block w-3 h-6.5 bg-no-repeat bg-top-left float-left"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg width='16' height='26' viewBox='0 0 16 26' xmlns='http://www.w3.org/2000/svg'><path d='M7 0h2v14H7zm2 12h7v2H9z' fill='%23D8D8D8' fill-rule='evenodd'/></svg>")`,
      }}
    />
  ),
  vertRight: () => (
    <span 
      className="inline-block w-3 h-6.5 bg-no-repeat bg-top-left float-left"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg width='16' height='26' viewBox='0 0 16 26' xmlns='http://www.w3.org/2000/svg'><path d='M7 0h2v27H7zm2 12h7v2H9z' fill='%23D8D8D8' fill-rule='evenodd'/></svg>")`,
      }}
    />
  ),
  vert: () => (
    <span 
      className="inline-block w-3 h-6.5 bg-no-repeat bg-top-left float-left"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg width='16' height='26' viewBox='0 0 16 26' xmlns='http://www.w3.org/2000/svg'><path d='M7 0h2v26H7z' fill='%23D8D8D8' fill-rule='evenodd'/></svg>")`,
      }}
    />
  ),
  empty: () => <span className="inline-block w-3 h-6.5 float-left" />,
};

const selectedTreeVariants = cva(
  'before:opacity-100 before:bg-accent/70 text-accent-foreground',
);

const dragOverVariants = cva(
  'before:opacity-100 before:bg-primary/20 text-primary-foreground',
);

interface TreeDataItem {
  id: string;
  name: string;
  icon?: any;
  selectedIcon?: any;
  openIcon?: any;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  droppable?: boolean;
  isRoot?: boolean;
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  expandAll?: boolean;
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void;
};

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      onDocumentDrag,
      ...props
    },
    ref,
  ) => {
    const [selectedItemId, setSelectedItemId] = React.useState<
      string | undefined
    >(initialSelectedItemId);

    const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(
      null,
    );

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined) => {
        setSelectedItemId(item?.id);
        if (onSelectChange) {
          onSelectChange(item);
        }
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

    const expandedItemIds = React.useMemo(() => {
      if (expandAll) {
        // Collect all item IDs when expandAll is true
        const ids: string[] = [];
        function collectAllIds(items: TreeDataItem[] | TreeDataItem) {
          if (items instanceof Array) {
            items.forEach((item) => {
              if (item.children) {
                ids.push(item.id);
                collectAllIds(item.children);
              }
            });
          } else if (items.children) {
            ids.push(items.id);
            collectAllIds(items.children);
          }
        }
        collectAllIds(data);
        return ids;
      }

      if (!initialSelectedItemId) {
        return [] as string[];
      }

      const ids: string[] = [];

      function walkTreeItems(
        items: TreeDataItem[] | TreeDataItem,
        targetId: string,
      ) {
        if (items instanceof Array) {
          for (let i = 0; i < items.length; i++) {
            ids.push(items[i]!.id);
            if (walkTreeItems(items[i]!, targetId)) {
              return true;
            }
            ids.pop();
          }
        } else if (items.id === targetId) {
          return true;
        } else if (items.children) {
          return walkTreeItems(items.children, targetId);
        }
      }

      walkTreeItems(data, initialSelectedItemId);
      return ids;
    }, [data, expandAll, initialSelectedItemId]);

    return (
      <div className={cn('relative overflow-hidden p-2', className)}>
        <TreeItem
          data={data}
          ref={ref}
          selectedItemId={selectedItemId}
          handleSelectChange={handleSelectChange}
          expandedItemIds={expandedItemIds}
          // defaultLeafIcon={defaultLeafIcon}
          defaultNodeIcon={defaultNodeIcon}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedItem={draggedItem}
          {...props}
        />
        <div className="h-12 w-full"></div>
      </div>
    );
  },
);
TreeView.displayName = 'TreeView';

type TreeItemProps = TreeProps & {
  selectedItemId?: string;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
};

// Helper function to generate tree markers based on Lighthouse pattern
// treeMarkers: boolean array where true = parent has siblings after (needs vertical line)
// This matches the Lighthouse crc-details-renderer.js pattern exactly
function generateTreeMarkers(
  treeMarkers: boolean[],
  isLast: boolean,
  hasChildren: boolean,
): React.ReactNode[] {
  const markers: React.ReactNode[] = [];
  
  // For each parent level: add vert (if has siblings) or empty, then always add empty spacer
  // This creates the vertical lines that continue through parent levels
  treeMarkers.forEach((separator, i) => {
    if (separator) {
      // Parent has siblings after it, so we need vertical continuation line
      markers.push(<TreeMarker.vert key={`vert-${i}`} />);
    } else {
      // No siblings after parent, so empty space (no vertical line needed)
      markers.push(<TreeMarker.empty key={`empty-${i}`} />);
    }
    // Always add an empty spacer marker after each level (matches Lighthouse pattern)
    markers.push(<TreeMarker.empty key={`spacer-${i}`} />);
  });
  
  // Add the connecting marker for this level
  // Last child uses up-right (L shape), middle child uses vert-right (vertical then right)
  if (isLast) {
    markers.push(<TreeMarker.upRight key="connector" />);
  } else {
    markers.push(<TreeMarker.vertRight key="connector" />);
  }
  
  // Always add horizontal right marker
  markers.push(<TreeMarker.right key="right" />);
  
  // Add horiz-down if has children (shows vertical line continues), otherwise another right
  if (hasChildren) {
    markers.push(<TreeMarker.horizDown key="end" />);
  } else {
    markers.push(<TreeMarker.right key="end" />);
  }
  
  return markers;
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      data,
      selectedItemId,
      handleSelectChange,
      expandedItemIds,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref,
  ) => {
    if (!(data instanceof Array)) {
      data = [data];
    }
    return (
      <div ref={ref} role="tree" className={className} {...props}>
        <ul className="list-none m-0 p-0">
          {data.map((item, index) => {
            const isLast = index === data.length - 1;
            return item.children ? (
              <TreeNode
                key={item.id}
                item={item}
                selectedItemId={selectedItemId}
                expandedItemIds={expandedItemIds}
                handleSelectChange={handleSelectChange}
                handleDragStart={handleDragStart}
                handleDrop={handleDrop}
                draggedItem={draggedItem}
                treeMarkers={[]}
                isLast={isLast}
              />
            ) : (
              <TreeLeaf
                key={item.id}
                item={item}
                selectedItemId={selectedItemId}
                handleSelectChange={handleSelectChange}
                handleDragStart={handleDragStart}
                handleDrop={handleDrop}
                draggedItem={draggedItem}
                treeMarkers={[]}
                isLast={isLast}
              />
            );
          })}
        </ul>
      </div>
    );
  },
);
TreeItem.displayName = 'TreeItem';

const TreeNode = ({
  item,
  handleSelectChange,
  expandedItemIds,
  selectedItemId,
  handleDragStart,
  handleDrop,
  draggedItem,
  treeMarkers = [],
  isLast = false,
}: {
  item: TreeDataItem;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItemIds: string[];
  selectedItemId?: string;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
  treeMarkers?: boolean[];
  isLast?: boolean;
}) => {
  const isExpanded = expandedItemIds.includes(item.id);
  const isLongest = item.name.includes("(Longest Chain)");
  const hasChildren = !!(item.children && item.children.length > 0);
  const markers = generateTreeMarkers(treeMarkers, isLast, hasChildren && isExpanded);

  return (
    <div className="relative">
      <div className={cn(
        "flex items-center h-6.5 leading-6.5 whitespace-nowrap scroll-auto",
        isLongest && "text-red-600 dark:text-red-400"
      )}>
        <span className="shrink-0">
          {markers}
        </span>
        <span className={cn(
          "ml-2.5 text-sm",
          isLongest ? "font-bold" : ""
        )}>
          {item.name.replace("| (Longest Chain)", "")}
        </span>
      </div>
      {item.children && isExpanded && (
        <div className="relative">
          <ul className="list-none m-0 p-0">
            {item.children.map((child, index) => {
              const ChildComponent = child.children ? TreeNode : TreeLeaf;
              const childIsLast = index === item.children!.length - 1;
              // Build new treeMarkers array: copy existing, add !isLast (true if has siblings after)
              const newTreeMarkers = [...treeMarkers, !isLast];
              return (
                <li key={child.id} className="relative">
                  <ChildComponent
                    item={child}
                    selectedItemId={selectedItemId}
                    expandedItemIds={expandedItemIds}
                    handleSelectChange={handleSelectChange}
                    handleDragStart={handleDragStart}
                    handleDrop={handleDrop}
                    draggedItem={draggedItem}
                    treeMarkers={newTreeMarkers}
                    isLast={childIsLast}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const TreeLeaf = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    item: TreeDataItem;
    selectedItemId?: string;
    handleSelectChange: (item: TreeDataItem | undefined) => void;
    handleDragStart?: (item: TreeDataItem) => void;
    handleDrop?: (item: TreeDataItem) => void;
    draggedItem: TreeDataItem | null;
    treeMarkers?: boolean[];
    isLast?: boolean;
  }
>(
  (
    {
      className,
      item,
      selectedItemId,
      handleSelectChange,
      handleDragStart,
      handleDrop,
      draggedItem,
      treeMarkers = [],
      isLast = false,
      ...props
    },
    ref,
  ) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const isLongest = item.name.includes("(Longest Chain)");
    const markers = generateTreeMarkers(treeMarkers, isLast, false);

    const onDragStart = (e: React.DragEvent) => {
      if (!item.draggable) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', item.id);
      handleDragStart?.(item);
    };

    const onDragOver = (e: React.DragEvent) => {
      if (
        item.droppable !== false &&
        draggedItem &&
        draggedItem.id !== item.id
      ) {
        e.preventDefault();
        setIsDragOver(true);
      }
    };

    const onDragLeave = () => {
      setIsDragOver(false);
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleDrop?.(item);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center h-6.5 leading-6.5 whitespace-nowrap cursor-pointer',
          className,
          selectedItemId === item.id && selectedTreeVariants(),
          isDragOver && dragOverVariants(),
        )}
        onClick={() => {
          handleSelectChange(item);
          item.onClick?.();
        }}
        draggable={!!item.draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        {...props}
      >
        <span className="shrink-0">
          {markers}
        </span>
        <span className={cn(
          "ml-2.5 text-xs",
          isLongest ? "text-red-600 dark:text-red-400 font-bold" : ""
        )}>
          {item.name}
        </span>
      </div>
    );
  },
);
TreeLeaf.displayName = 'TreeLeaf';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex w-full flex-1 items-center py-2 transition-all first:[&[data-state=open]>svg]:rotate-90',
        className,
      )}
      {...props}
    >
      <ChevronRight className="mr-1 h-4 w-4 shrink-0 text-accent-foreground/50 transition-transform duration-200" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
      className,
    )}
    {...props}
  >
    <div className="pb-1 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

// TreeIcon and TreeActions removed - not used in Lighthouse-style tree

export { TreeView, type TreeDataItem };
