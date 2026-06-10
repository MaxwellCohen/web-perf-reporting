import type {
  Cell,
  CellContext,
  ColumnDef,
  FilterFn,
  Header,
  HeaderContext,
  HeaderGroup,
  ReactTable,
  Row,
  RowData,
  StockFeatures,
  TableState,
} from "@tanstack/react-table-v9";

/** v9 stock-feature table types (`useTable` + `createStockColumnHelper`). */
export type StockColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  StockFeatures,
  TData,
  TValue
>;
export type StockRow<TData extends RowData> = Row<StockFeatures, TData>;
export type StockCell<TData extends RowData, TValue = unknown> = Cell<StockFeatures, TData, TValue>;
export type StockTable<TData extends RowData> = ReactTable<
  StockFeatures,
  TData,
  TableState<StockFeatures>
>;
export type StockHeader<TData extends RowData, TValue = unknown> = Header<
  StockFeatures,
  TData,
  TValue
>;
export type StockHeaderGroup<TData extends RowData> = HeaderGroup<StockFeatures, TData>;
export type StockCellContext<TData extends RowData, TValue = unknown> = CellContext<
  StockFeatures,
  TData,
  TValue
>;
export type StockHeaderContext<TData extends RowData, TValue = unknown> = HeaderContext<
  StockFeatures,
  TData,
  TValue
>;
export type StockFilterFn = FilterFn<StockFeatures, RowData>;
