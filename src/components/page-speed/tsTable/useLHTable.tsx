import { PageSpeedInsights } from '@/lib/schema';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  Row,
  useReactTable,
} from '@tanstack/react-table';
import { Fragment, useMemo, useState } from 'react';
import { HorizontalScoreChart } from '../../common/PageSpeedGaugeChart';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import { AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { AccordionContent } from '@radix-ui/react-accordion';
import { AuditDetailsSummary } from '../lh-categories/AuditDetailsSummary';
import { RenderMetricSavings } from '../lh-categories/RenderMetricSavings';
import { RenderDetails } from '../lh-categories/RenderDetails';
import { RenderJSONDetails } from '../RenderJSONDetails';
import { TableDataItem } from './TableDataItem';
import { categorySortFn } from './categorySortFn';

const columnHelper = createColumnHelper<TableDataItem>();
const columns = [
  columnHelper.accessor((row) => row._category?.title || '', {
    id: 'category_title',
    header: 'Category',
    enableGrouping: true,
    sortingFn: categorySortFn,
    cell: (props) => {
      const category = props.getValue();
      return <div className="basis-48 text-xl font-bold">{category}</div>;
    },
  }),
  columnHelper.accessor((r) => [r._category.score, r._userLabel].join(':::'), {
    id: 'category_score',
    header: 'Category Score',
    enableGrouping: true,
    enablePinning: true,
    aggregationFn: 'unique',
    cell(props) {
      let value: string | string[] = props.getValue();
      if (!value || props.row.groupingValue === 'Core Web Vitals') {
        return null;
      }
      value = Array.isArray(value) ? (value as string[]) : [value];

      return value.map((v) => {
        const [scoreStr = 0, label = ''] = v.split(':::');
        const score = +scoreStr;
        return (
          <div key={v} className="flex flex-row items-center gap-2">
            <div className="flex-0 flex grow w-64 flex-col gap-2 align-top hover:no-underline">
              <div className="text-center text-xs hover:no-underline">
                {label ? `${label} - ` : ''}
                {Math.round(score * 100)}
              </div>
              <HorizontalScoreChart
                score={score || 0}
                className="h-2 min-w-11 flex-1 overflow-hidden"
              />
            </div>
          </div>
        );
      });
    },
  }),

  columnHelper.accessor('auditRef.group', {
    id: 'auditGroup',
    enableGrouping: true,
    header: 'Audit Group',
  }),
  columnHelper.accessor('_userLabel', {
    id: 'userLabel',
    enableGrouping: true,
    enableColumnFilter: true,
    filterFn: 'arrIncludesSome',
    sortingFn: 'alphanumeric',
    header: 'User Label',
  }),
  columnHelper.accessor('auditRef.id', {
    id: 'id',
    header: 'Id',
    enableGrouping: true,
  }),
  columnHelper.accessor('auditRef.group', {
    header: 'Group',
    enableGrouping: false,
  }),
  columnHelper.accessor('auditResult.title', {
    id: 'auditTitle',
    header: 'Audit Title',
    enableGrouping: true,
  }),
  columnHelper.accessor('auditResult.description', {
    header: 'Description',
    enableGrouping: true,
    cell: (info) => {
      const str = info.getValue()?.toString() || '';
      if (!str) {
        return null;
      }
      return (
        <div className="text-sm font-normal">
          <ReactMarkdown>{info.getValue()?.toString() || ''}</ReactMarkdown>
        </div>
      );
    },
  }),
  columnHelper.accessor('auditResult.score', {
    header: 'Score',
    enableGrouping: true,
  }),
  columnHelper.accessor('auditResult.displayValue', {
    header: 'Display Value',
    enableGrouping: false,
  }),
  columnHelper.accessor('auditResult.details', {
    header: 'Details',
    enableGrouping: false,
  }),
];

export function useLHTable(
  items: { item: PageSpeedInsights; label: string }[],
) {
  const tableDataArr = useMemo(
    () =>
      (
        items
          .map(({ item, label }) => {
            // flaten the categories
            return Object.values(item.lighthouseResult?.categories || {}).map(
              (category) => {
                if (!category?.auditRefs?.length) {
                  return [] as TableDataItem[];
                }
                const { auditRefs = [], ..._category } = category;
                return auditRefs.map((ar) => {
                  if (!ar.id) return [] as TableDataItem[];
                  return {
                    _category,
                    _userLabel: label,
                    auditRef: ar,
                    auditResult: item.lighthouseResult?.audits?.[ar.id],
                  };
                });
              },
            );
          })
          .flat(2) as TableDataItem[]
      ).filter((v) => v.auditRef.group !== 'metrics'),
    [items],
  );
  const [grouping, setGrouping] = useState(['category_title', 'id']);
  return useReactTable({
    data: tableDataArr,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGroupingChange: setGrouping,
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    manualExpanding: true,
    enableColumnFilters: true,
    enableColumnPinning: true,

    filterFns: {
      'booleanFilterFn': () => true,
    },
    state: {
      grouping,
    },
  });
}

export function CategoryRow({ row }: { row: Row<TableDataItem> }) {
  'use no memo'
  return (
    <AccordionItem value={row.id} key={row.id}>
      <AccordionTrigger
        className=""
        disabled={!row.getCanExpand()}
        onClick={row.getToggleExpandedHandler()}
      >
        {row
          .getAllCells()
          .filter((cell) =>
            ['category_title', 'category_score'].includes(cell.column.id),
          )
          .map((cell) => {
            return (
              <Fragment key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </Fragment>
            );
          })}
      </AccordionTrigger>
      <AccordionContent>
        {row.getIsExpanded()
          ? row.subRows.map((subRow) => (
              <AuditSummaryRow row={subRow} key={subRow.id} />
            ))
          : null}
      </AccordionContent>
    </AccordionItem>
  );
}

export function AuditSummaryRow({ row }: { row: Row<TableDataItem> }) {
  const auditData = row.subRows.map((sr) => sr.original.auditResult || {});
  const labels = row.subRows.map((sr) => sr.original._userLabel || '');
  return (
    <AccordionItem
      value={row.id}
        className={clsx(
        'items-center gap-4 border border-x-4 border-gray-400 py-2',
      )}
    >
      <AccordionTrigger
        disabled={!row.getCanExpand()}
        onClick={row.getToggleExpandedHandler()}
      >
        <AuditDetailsSummary
          auditData={auditData}
          labels={labels}
          acronym={row.subRows[0]?.original.auditRef.acronym}
        />
      </AccordionTrigger>
      <AccordionContent>
        <RenderJSONDetails
          className="text-right"
          data={auditData[0]}
          data2={auditData[1]}
          title={`All Data for ${auditData[0]?.id}`}
        />
        <RenderMetricSavings auditData={auditData} labels={labels} />
        <RenderDetails items={row.subRows.map((r) => r.original)} />
      </AccordionContent>
    </AccordionItem>
  );
}
