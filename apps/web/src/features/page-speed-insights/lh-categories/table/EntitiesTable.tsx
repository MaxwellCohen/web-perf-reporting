"use client";
import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";
import { renderBoolean } from "@/features/page-speed-insights/lh-categories/renderBoolean";
import {
  useStandardTable,
  type StandardColumnDef,
} from "@/features/page-speed-insights/tanstack-table-v9/useStandardTable";
import { createStockColumnHelper } from "@/features/page-speed-insights/tanstack-table-v9/createStockColumnHelper";
import { useTableColumns } from "@/features/page-speed-insights/shared/useTableColumns";
import { TableCard } from "@/features/page-speed-insights/shared/TableCard";
import { AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AccordionSectionTitleTrigger } from "@/components/ui/accordion-section-title-trigger";
import {
  createBooleanAggregatedCell,
  createOriginsArrayAggregatedCell,
  createStringAggregatedCell,
} from "@/features/page-speed-insights/shared/aggregatedCellHelpers";


type EntityTableRow = {
  label: string;
  name: string;
  isFirstParty: boolean;
  isUnrecognized: boolean;
  origins: string[];
};

const columnHelper = createStockColumnHelper<EntityTableRow>();
const cols: StandardColumnDef<EntityTableRow>[] = [
  columnHelper.accessor("name", {
    id: "name",
    header: "Name",
    enableSorting: true,
    enableGrouping: true,
    enableResizing: true,
    filterFn: "includesString",
    aggregationFn: "unique",
    aggregatedCell: createStringAggregatedCell("name", undefined, false),
  }),
  columnHelper.accessor("isFirstParty", {
    id: "isFirstParty",
    header: "Is First Party",
    enableSorting: true,
    enableResizing: true,
    // @ts-expect-error v9 custom filter key registered in useStandardTable filterFns
    filterFn: "booleanFilterFn",
    cell: (info) => renderBoolean(!!info.getValue()),
    aggregatedCell: createBooleanAggregatedCell("isFirstParty", renderBoolean),
  }),
  columnHelper.accessor("isUnrecognized", {
    id: "isUnrecognized",
    header: "Is Unrecognized",
    enableSorting: true,
    enableResizing: true,
    // @ts-expect-error v9 custom filter key registered in useStandardTable filterFns
    filterFn: "booleanFilterFn",
    cell: (info) => renderBoolean(!!info.getValue()),
    aggregatedCell: createBooleanAggregatedCell("isUnrecognized", renderBoolean),
  }),
  columnHelper.accessor("origins", {
    id: "origins",
    header: "Origins",
    enableSorting: false,
    enableResizing: true,
    cell: (info) => {
      const origins = info.getValue() as string[];
      return (
        <div>
          {origins.map((origin, i) => (
            <div key={`${i}-${origin}`}>{origin}</div>
          ))}
        </div>
      );
    },
    aggregatedCell: createOriginsArrayAggregatedCell<EntityTableRow>(),
  }),
];

export function EntitiesTable() {
  const items = usePageSpeedItems();

  const validItems = items.filter(({ item }) => {
    const entities = item?.lighthouseResult?.entities;
    return Array.isArray(entities) && entities.length > 0;
  });

  const data = validItems.flatMap(({ item, label }) => {
    const entities = item?.lighthouseResult?.entities;
    if (!entities?.length) return [];
    return entities
      .filter((entity): entity is NonNullable<typeof entity> => !!entity)
      .map((entity) => ({
        label,
        name: entity.name || "",
        isFirstParty: entity.isFirstParty || false,
        isUnrecognized: entity.isUnrecognized || false,
        origins: entity.origins || [],
      }));
  });

  const showReportColumn = validItems.length > 1;
  const hasEntities = validItems.length > 0;

  const columns = useTableColumns<EntityTableRow>(cols, columnHelper, showReportColumn);

  if (!hasEntities) {
    return null;
  }
  return <EntitiesTableContent data={data} columns={columns} />;
}

function EntitiesTableContent({
  data,
  columns,
}: {
  data: EntityTableRow[];
  columns: StandardColumnDef<EntityTableRow>[];
}) {
  const table = useStandardTable({
    data,
    columns,
    grouping: ["name"],
    defaultPageSize: data.length,
    enablePagination: true,
  });
  return (
    <AccordionItem value={"entities"}>
      <AccordionSectionTitleTrigger>Entities</AccordionSectionTitleTrigger>
      <AccordionContent>
        <TableCard title="Third-Party Entities" table={table} />
      </AccordionContent>
    </AccordionItem>
  );
}
