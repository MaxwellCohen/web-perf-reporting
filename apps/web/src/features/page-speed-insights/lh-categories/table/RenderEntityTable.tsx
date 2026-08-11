import { TableItem, TableColumnHeading, DeviceType } from "@/lib/schema";
import { Fragment, useMemo, type ReactNode, type RefObject } from "react";
import { getDerivedSubItemsHeading } from "@/features/page-speed-insights/lh-categories/table/utils";
import { RenderTableRowContainer } from "@/features/page-speed-insights/lh-categories/table/RenderTableRowContainer";
import { RenderTableHeader } from "@/features/page-speed-insights/lh-categories/table/RenderTableHeader";
import { RenderTableCell } from "@/features/page-speed-insights/lh-categories/table/RenderTableCell";
import { getEntityGroupItems } from "@/features/page-speed-insights/lh-categories/table/getEntityGroupItems";
import { GridTableWithCopyToolbar } from "@/features/page-speed-insights/lh-categories/table/GridTableWithCopyToolbar";
import {
  GridColumnResizeProvider,
  gridTemplateColumnsFromWidths,
  useGridColumnResize,
} from "@/features/page-speed-insights/lh-categories/table/gridColumnResize";

function EntityTableGrid({
  headings,
  containerRef,
  children,
}: {
  headings: TableColumnHeading[];
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const resize = useGridColumnResize();
  const gridTemplateColumns = resize
    ? gridTemplateColumnsFromWidths(resize.widths)
    : `repeat(${headings.length || 0}, minmax(140px, 1fr))`;

  return (
    <div
      ref={containerRef}
      className="grid min-w-0 overflow-x-auto"
      style={{ gridTemplateColumns }}
    >
      {children}
    </div>
  );
}

export function RenderEntityTable({
  headings = [],
  device,
  items,
  isEntityGrouped,
  skipSumming,
  sortedBy,
}: {
  headings?: TableColumnHeading[];
  device: DeviceType;
  items: TableItem[];
  isEntityGrouped: boolean;
  skipSumming: string[];
  sortedBy: string[];
}) {
  const entityItems = useMemo(
    () =>
      getEntityGroupItems({
        items,
        headings,
        isEntityGrouped,
        skipSumming,
        sortedBy,
      }),
    [items, headings, isEntityGrouped, skipSumming, sortedBy],
  );

  return (
    <GridTableWithCopyToolbar>
      {({ containerRef }) => (
        <GridColumnResizeProvider headings={headings}>
          <EntityTableGrid headings={headings} containerRef={containerRef}>
            <RenderTableHeader headings={headings} />
            {entityItems?.map((entityItem, index) => (
              <Fragment key={index}>
                <RenderTableRowContainer>
                  {headings.map((heading, colIndex) => {
                    if (!heading.key) return null;
                    return (
                      <RenderTableCell
                        key={`${index}-${colIndex}`}
                        className="whitespace-nowrap px-6 py-2 text-sm"
                        style={{
                          gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                        }}
                        value={entityItem[heading.key || ""]}
                        heading={heading}
                        device={(entityItem?._device as DeviceType) || device}
                      />
                    );
                  })}
                </RenderTableRowContainer>
                {items
                  .filter((item) => item.entity === entityItem.entity)
                  .map((item, subIndex) => (
                    <Fragment key={`${index}-${subIndex}`}>
                      <RenderTableRowContainer>
                        {headings.map((heading, colIndex) => {
                          if (!heading.key) return null;
                          return (
                            <RenderTableCell
                              key={`${index}-${colIndex}`}
                              className="whitespace-nowrap px-6 py-2 text-sm"
                              style={{
                                gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                              }}
                              value={item[heading.key]}
                              heading={heading}
                              device={(item?._device as DeviceType) || device}
                            />
                          );
                        })}
                      </RenderTableRowContainer>
                      {item.subItems?.items.map((subItem, nestedIndex) => (
                        <RenderTableRowContainer key={nestedIndex} className="border-red-500">
                          {headings.map((heading, colIndex) => {
                            if (!heading.subItemsHeading?.key) return null;
                            return (
                              <RenderTableCell
                                key={`${index}-${colIndex}`}
                                className="whitespace-nowrap px-6 py-2 text-sm"
                                style={{
                                  gridColumn: `${colIndex + 1} / ${colIndex + 2}`,
                                }}
                                value={subItem[heading.subItemsHeading.key]}
                                heading={getDerivedSubItemsHeading(heading)}
                                device={(subItem._device as DeviceType) || device}
                              />
                            );
                          })}
                        </RenderTableRowContainer>
                      ))}
                    </Fragment>
                  ))}
              </Fragment>
            ))}
          </EntityTableGrid>
        </GridColumnResizeProvider>
      )}
    </GridTableWithCopyToolbar>
  );
}
