import type {
  Cell,
  CellContext,
  ColumnDef,
  ColumnHelper,
  Header,
  HeaderGroup,
  ReactTable,
  Row,
  RowData,
  TableFeatures,
} from "@tanstack/react-table";
import type { standardTableFeatures } from "@/features/page-speed-insights/tanstack-table-v9/features";

/**
 * Default feature bundle for PSI tables. Tables with a different bundle (LH accordion, debug data)
 * pass their own `typeof ...Features` as the trailing `TFeatures` argument.
 */
export type StockFeatures = typeof standardTableFeatures;

/** Shared PSI table aliases built on {@link StockFeatures}. */
export type StockColumnDef<
  TData extends RowData,
  TValue = unknown,
  TFeatures extends TableFeatures = StockFeatures,
> = ColumnDef<TFeatures, TData, TValue>;
export type StockRow<TData extends RowData, TFeatures extends TableFeatures = StockFeatures> = Row<
  TFeatures,
  TData
>;
export type StockCell<
  TData extends RowData,
  TValue = unknown,
  TFeatures extends TableFeatures = StockFeatures,
> = Cell<TFeatures, TData, TValue>;
export type StockTable<
  TData extends RowData,
  TFeatures extends TableFeatures = StockFeatures,
> = ReactTable<TFeatures, TData>;
export type StockHeader<
  TData extends RowData,
  TValue = unknown,
  TFeatures extends TableFeatures = StockFeatures,
> = Header<TFeatures, TData, TValue>;
export type StockHeaderGroup<
  TData extends RowData,
  TFeatures extends TableFeatures = StockFeatures,
> = HeaderGroup<TFeatures, TData>;
export type StockCellContext<
  TData extends RowData,
  TValue = unknown,
  TFeatures extends TableFeatures = StockFeatures,
> = CellContext<TFeatures, TData, TValue>;

/**
 * TanStack's own heterogeneous column-array type (`ColumnHelper.columns`): column defs are invariant
 * in TValue, so a list mixing string / number / boolean accessors only type-checks against the
 * helper's value-erased element type. Any single typed accessor column is assignable to it.
 */
type StockColumnDefs<TData extends RowData> = ReturnType<
  ColumnHelper<StockFeatures, TData>["columns"]
>;
export type StockAnyColumnDef<TData extends RowData> = StockColumnDefs<TData>[number];
