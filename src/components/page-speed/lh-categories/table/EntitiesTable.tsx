'use client';
import { useContext, useMemo } from 'react';
import { InsightsContext } from '@/components/page-speed/PageSpeedContext';
import { renderBoolean } from '@/components/page-speed/lh-categories/renderBoolean';
import {
  ColumnDef,
  createColumnHelper,
  FilterFn,
  CellContext,
  Row,
} from '@tanstack/react-table';
import { useStandardTable } from '@/components/page-speed/shared/tableConfigHelpers';
import { useTableColumns } from '@/components/page-speed/shared/useTableColumns';
import { TableCard } from '@/components/page-speed/shared/TableCard';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { extractValueLabelPairs, createStringAggregatedCell } from '@/components/page-speed/shared/aggregatedCellHelpers';
import React from 'react';

declare module '@tanstack/react-table' {
  interface FilterFns {
    booleanFilterFn: FilterFn<unknown>;
  }
}

type EntityTableRow = {
  label: string;
  name: string;
  isFirstParty: boolean;
  isUnrecognized: boolean;
  origins: string[];
};

// Create aggregated cell for boolean values
const createBooleanAggregatedCell = (columnId: string) => {
  // eslint-disable-next-line react/display-name
  return (info: CellContext<EntityTableRow, unknown>): React.ReactNode => {
    const row = info.row;
    const valueLabelPairs = extractValueLabelPairs<boolean>(row, columnId);

    if (valueLabelPairs.length === 0) return 'N/A';

    const uniqueValues = [...new Set(valueLabelPairs.map((p) => p.value))];
    const uniqueLabels = [...new Set(valueLabelPairs.map((p) => p.label))];
    
    if (uniqueValues.length === 1) {
      const value = uniqueValues[0];
      if (uniqueLabels.length > 1) {
        return (
          <div className="flex items-center gap-2">
            {renderBoolean(value)}
            <span className="text-xs text-muted-foreground">(All Devices)</span>
          </div>
        );
      }
      return renderBoolean(value);
    }

    const valueGroups = new Map<boolean, string[]>();
    valueLabelPairs.forEach(({ value, label }) => {
      if (!valueGroups.has(value)) {
        valueGroups.set(value, []);
      }
      valueGroups.get(value)!.push(label);
    });

    return (
      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
        {Array.from(valueGroups.entries()).map(([value, labels], i) => {
          const uniqueLabelsForValue = [...new Set(labels)];
          return (
            <div key={i} className="flex items-center gap-2">
              {renderBoolean(value)}
              {uniqueLabelsForValue.length === 1 && (
                <span className="text-xs text-muted-foreground">({uniqueLabelsForValue[0]})</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
};

// Create aggregated cell for origins array
const createOriginsAggregatedCell = () => {
  // eslint-disable-next-line react/display-name
  return (info: CellContext<EntityTableRow, unknown>): React.ReactNode => {
    const row = info.row;
    const leafRows = row.getLeafRows();
    const allOrigins: string[] = [];
    
    leafRows.forEach((r: Row<EntityTableRow>) => {
      const origins = r.getValue('origins') as string[];
      if (Array.isArray(origins)) {
        allOrigins.push(...origins);
      }
    });

    if (allOrigins.length === 0) return 'N/A';

    const uniqueOrigins = [...new Set(allOrigins)];
    
    return (
      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
        {uniqueOrigins.map((origin, i) => (
          <div key={`${i}-${origin}`}>{origin}</div>
        ))}
      </div>
    );
  };
};

const columnHelper = createColumnHelper<EntityTableRow>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cols: ColumnDef<EntityTableRow, any>[] = [
  columnHelper.accessor('name', {
    id: 'name',
    header: 'Name',
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: 'includesString',
    aggregationFn: 'unique',
    aggregatedCell: createStringAggregatedCell('name', undefined, false),
  }),
  columnHelper.accessor('isFirstParty', {
    id: 'isFirstParty',
    header: 'Is First Party',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'booleanFilterFn',
    cell: (info) => renderBoolean(!!info.getValue()),
    aggregatedCell: createBooleanAggregatedCell('isFirstParty'),
  }),
  columnHelper.accessor('isUnrecognized', {
    id: 'isUnrecognized',
    header: 'Is Unrecognized',
    enableSorting: true,
    enableResizing: true,
    filterFn: 'booleanFilterFn',
    cell: (info) => renderBoolean(!!info.getValue()),
    aggregatedCell: createBooleanAggregatedCell('isUnrecognized'),
  }),
  columnHelper.accessor('origins', {
    id: 'origins',
    header: 'Origins',
    enableSorting: false,
    enableResizing: true,
    cell: (info) => {
      const origins = info.getValue();
      return (
        <div>
          {origins.map((origin: string, i: number) => (
            <div key={`${i}-${origin}`}>{origin}</div>
          ))}
        </div>
      );
    },
    aggregatedCell: createOriginsAggregatedCell(),
  }),
];

export function EntitiesTable() {
  'use no memo';
  const items = useContext(InsightsContext);

  const validItems = useMemo(() => {
    return items.filter(({ item }) => {
      const entities = item?.lighthouseResult?.entities;
      return entities && Array.isArray(entities) && entities.length > 0;
    });
  }, [items]);

  const showReportColumn = validItems.length > 1;

  // Combine all entities data with labels
  const data = useMemo<EntityTableRow[]>(() => {
    return validItems.flatMap(({ item, label }) => {
      const entities = item?.lighthouseResult?.entities;
      if (!entities || !Array.isArray(entities)) {
        return [];
      }
      return entities
        .filter((entity): entity is NonNullable<typeof entity> => !!entity)
        .map((entity) => ({
          label,
          name: entity.name || '',
          isFirstParty: entity.isFirstParty || false,
          isUnrecognized: entity.isUnrecognized || false,
          origins: entity.origins || [],
        }));
    });
  }, [validItems]);

  const columns = useTableColumns<EntityTableRow>(cols, columnHelper, showReportColumn);

  const table = useStandardTable({
    data,
    columns,
    grouping: ['name'],
    defaultPageSize: data.length,
    enablePagination: true,
  });

  if (!validItems.length) {
    return null;
  }

  return (
    <AccordionItem value={'entities'}>
      <AccordionTrigger>
        <div className="text-lg font-bold group-hover:underline">Entities</div>
      </AccordionTrigger>
      <AccordionContent>
        <TableCard
          title="Third-Party Entities"
          table={table}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
