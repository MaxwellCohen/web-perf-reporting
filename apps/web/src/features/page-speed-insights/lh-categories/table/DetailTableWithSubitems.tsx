"use client";
import type { StockColumnDef } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { createStockColumnHelper as createColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { RenderTableValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { DetailTableSection } from "@/features/page-speed-insights/lh-categories/table/DetailTableSection";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { useStandardTable } from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { SORT_VALUE_SEPARATOR } from "@/features/page-speed-insights/lh-categories/table/constants";
import {
  DetailTableDataRow,
  flattenDetailRows,
} from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import {
  canGroup,
  DetailTableItem,
} from "@/features/page-speed-insights/lh-categories/table/detailTableShared";
import {
  getExpandingControlColumn,
  getFilterFn,
  setSizeSetting,
} from "@/features/page-speed-insights/lh-categories/table/detailTableColumns";

/**
 * Combines item and subitem values for sorting/comparison
 */
const combineItemSubItemValue = (itemVal: unknown, subItemVal: unknown): unknown => {
  if (typeof subItemVal === "number" && typeof itemVal === "number") {
    // Combine numbers: item.subitem format (e.g., 123.45)
    const itemNum = Number(itemVal.toString().replace(/[^0-9]/g, "")) || 0;
    const subNum = Number(subItemVal.toString().replace(/[^0-9]/g, "")) || 0;
    return Number(`${itemNum}.${subNum}`);
  }

  if (typeof subItemVal === "string" && typeof itemVal === "string") {
    // Combine strings with separator for sorting
    return `${itemVal}${SORT_VALUE_SEPARATOR}${subItemVal}`;
  }

  return subItemVal ?? itemVal;
};

export function DetailTableWithSubitems({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  const data = flattenDetailRows(rows);

  // Create columns
  const sColumnHelper = createColumnHelper<DetailTableDataRow>();
  const columnDef: StockColumnDef<DetailTableDataRow, unknown>[] = [getExpandingControlColumn()];
  const firstRow = rows[0];
  if (firstRow) {
    firstRow.auditResult.details.headings.forEach((h) => {
      if (!h.key) {
        return;
      }

      const key = h.key;
      const subItemKey = h.subItemsHeading?.key;
      if (!subItemKey) {
        return;
      }

      const subItem = {
        ...h,
        ...h.subItemsHeading,
      };
      const valueType = h.valueType || "text";

      columnDef.push(
        sColumnHelper.accessor(
          (r) => {
            const subItemVal = r.subitem?.[subItemKey];
            const itemVal = r.item[key];
            return combineItemSubItemValue(itemVal, subItemVal);
          },
          {
            id: `${key}_${subItemKey}`,
            header: typeof subItem.label === "string" ? subItem.label : "",
            enableGrouping: canGroup(valueType),
            enableHiding: true,
            enableSorting: true,
            enableMultiSort: true,
            filterFn: getFilterFn(valueType),
            getGroupingValue: (r) => {
              const val = r.item[key];
              return typeof val === "string" ? val : undefined;
            },
            ...setSizeSetting(valueType),
            cell: (info) => {
              const r = info.row.original;
              const subItemVal = r.subitem?.[subItemKey];
              const itemVal = r.item[key];
              const val = subItemVal ?? itemVal;

              return (
                <RenderTableValue
                  key={JSON.stringify(val)}
                  value={val}
                  heading={subItem}
                  device={r._userLabel || ""}
                />
              );
            },
            aggregatedCell(props) {
              const value = props.row.original.item[key];
              return (
                <RenderTableValue value={value} heading={h} device={firstRow._userLabel || ""} />
              );
            },
            meta: {
              heading: {
                heading: subItem,
              },
            },
          },
        ),
      );
    });
  }
  const columns = columnDef;

  // Calculate default grouping
  const groupableColumn = columns.find((c) => c.id && c.enableGrouping)?.id;
  const defaultGrouping = groupableColumn ? [groupableColumn] : [];

  const table = useStandardTable({
    data,
    columns,
    grouping: defaultGrouping,
    enablePagination: false,
  });

  return (
    <DetailTableSection title={title} titleClassName="min-w-0 flex-1 truncate">
      <TableCard.Table table={table} />
    </DetailTableSection>
  );
}
