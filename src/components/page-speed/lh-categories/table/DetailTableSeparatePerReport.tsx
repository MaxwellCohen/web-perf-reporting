'use client';
import { TableItem, OpportunityItem, AuditDetailTable } from '@/lib/schema';
import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues, SortingState, ColumnFiltersState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { toTitleCase } from '@/components/page-speed/toTitleCase';
import { DetailTableItem, canSort, canGroup, isNumberColumn } from '@/components/page-speed/lh-categories/table/RenderTable';
import { RenderTableValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import { ItemValue } from '@/lib/schema';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Table } from '@/components/ui/table';
import { DataTableHeader } from '@/components/page-speed/lh-categories/table/DataTableHeader';
import { DataTableBody } from '@/components/page-speed/lh-categories/table/DataTableBody';
import { booleanFilterFn } from '@/components/page-speed/lh-categories/table/DataTableNoGrouping';

/**
 * Component that renders one table per report for audits configured to show separate tables.
 * This is useful for audits like dom-size-insight where you want to see each report's data separately.
 */
export function DetailTableSeparatePerReport({
  rows,
  title,
}: {
  rows: DetailTableItem[];
  title: string;
}) {
  // Group rows by report label
  const rowsByReport = useMemo(() => {
    const grouped = new Map<string, DetailTableItem[]>();
    rows.forEach((row) => {
      const label = row._userLabel || 'Unknown';
      if (!grouped.has(label)) {
        grouped.set(label, []);
      }
      grouped.get(label)!.push(row);
    });
    return grouped;
  }, [rows]);

  // Helper to create columns with device label
  const createColumns = (deviceLabel: string) => {
    const firstRow = rows[0];
    if (!firstRow) {
      return [];
    }

    const sColumnHelper = createColumnHelper<TableItem | OpportunityItem>();

    return firstRow.auditResult.details.headings
      .map((h, i) => {
        if (!h.key) {
          return null;
        }
        const key = h.key as keyof TableItem;
        return sColumnHelper.accessor((r) => r[key] ?? undefined, {
          id: `${i}_${key}`,
          header: `${h.label || toTitleCase(key as string)}`,
          enableSorting: canSort(h.valueType),
          sortingFn: 'alphanumeric',
          enableColumnFilter: canGroup(h.valueType) || isNumberColumn(h.valueType),
          filterFn: canGroup(h.valueType)
            ? 'includesString'
            : isNumberColumn(h.valueType)
              ? 'inNumberRange'
              : undefined,
          enableResizing: true,
          minSize: 200,
          cell: (info) => {
            const value = info.getValue();
            return (
              <RenderTableValue
                value={value as ItemValue}
                heading={h}
                device={deviceLabel}
              />
            );
          },
          meta: {
            heading: { heading: h },
          },
        });
      })
      .filter((v) => !!v);
  };

  // Helper function to create a better title for each report
  const getReportTitle = (reportLabel: string, itemCount: number) => {
    const auditTitle = toTitleCase(title);
    // Format the report label nicely
    let formattedLabel = reportLabel;
    if (reportLabel.includes('Mobile')) {
      formattedLabel = 'Mobile';
    } else if (reportLabel.includes('Desktop')) {
      formattedLabel = 'Desktop';
    } else if (reportLabel.includes('All Devices')) {
      formattedLabel = 'All Devices';
    }
    return `${auditTitle} - ${formattedLabel} (${itemCount} ${itemCount === 1 ? 'item' : 'items'})`;
  };

  // Render one accordion per report table
  const sortedReports = Array.from(rowsByReport.entries())
    .sort(([labelA], [labelB]) => {
      // Sort: All Devices first, then Mobile, then Desktop
      if (labelA === 'All Devices' && labelB !== 'All Devices') return -1;
      if (labelA !== 'All Devices' && labelB === 'All Devices') return 1;
      const order = ['Mobile', 'Desktop'];
      const aIndex = order.findIndex((l) => labelA.includes(l));
      const bIndex = order.findIndex((l) => labelB.includes(l));
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return labelA.localeCompare(labelB);
    })
    .map(([reportLabel, reportRows]) => {
      // Extract data for this report
      const data = reportRows.flatMap((r) => {
        const details = r.auditResult?.details as AuditDetailTable;
        return details?.items || [];
      });

      if (data.length === 0) {
        return null;
      }

      return { reportLabel, reportRows, data };
    })
    .filter((v) => v !== null) as Array<{ reportLabel: string; reportRows: DetailTableItem[]; data: (TableItem | OpportunityItem)[] }>;

  return (
    <Accordion type="single" collapsible className="w-full">
      {sortedReports.map(({ reportLabel, data }) => {
        const accordionValue = `${title}-${reportLabel}`.replace(/\s+/g, '-').toLowerCase();
        const reportTitle = getReportTitle(reportLabel, data.length);

        // Create table instance for this report's data
        const ReportTable = () => {
          const [sorting, setSorting] = useState<SortingState>([]);
          const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
          const reportColumns = createColumns(reportLabel);
          const table = useReactTable({
            columns: reportColumns,
            data,
            getCoreRowModel: getCoreRowModel(),
            enableSorting: true,
            onSortingChange: setSorting,
            getSortedRowModel: getSortedRowModel(),
            enableColumnFilters: true,
            onColumnFiltersChange: setColumnFilters,
            getFilteredRowModel: getFilteredRowModel(),
            getFacetedRowModel: getFacetedRowModel(),
            getFacetedUniqueValues: getFacetedUniqueValues(),
            getFacetedMinMaxValues: getFacetedMinMaxValues(),
            enableColumnResizing: true,
            columnResizeMode: 'onChange',
            filterFns: {
              booleanFilterFn,
            },
            state: {
              sorting,
              columnFilters,
            },
          });

          return (
            <div className="w-full overflow-x-auto">
              <Table className="w-full" style={{ width: '100%' }}>
                <DataTableHeader table={table} />
                <DataTableBody table={table} />
              </Table>
            </div>
          );
        };

        return (
          <AccordionItem key={accordionValue} value={accordionValue}>
            <AccordionTrigger>
              <div className="text-base font-semibold text-left">
                {reportTitle}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ReportTable />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

