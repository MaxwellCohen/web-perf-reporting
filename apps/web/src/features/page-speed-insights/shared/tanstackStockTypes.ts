/* eslint-disable @typescript-eslint/no-explicit-any */
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
} from "@tanstack/react-table";

/**
 * Shared PSI table aliases. Column defs use `any` features so string
 * filter/sort/aggregation keys typecheck; table/row use `any` features too.
 * Concrete `useTable()` instances may need `as StockTable<T>` where invariant
 * feature generics block assignability.
 */
export type StockColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<any, TData, TValue>;
export type StockRow<TData extends RowData> = Row<any, TData>;
export type StockCell<TData extends RowData, TValue = unknown> = Cell<any, TData, TValue>;
export type StockTable<TData extends RowData> = ReactTable<any, TData, any>;
export type StockHeader<TData extends RowData, TValue = unknown> = Header<any, TData, TValue>;
export type StockHeaderGroup<TData extends RowData> = HeaderGroup<any, TData>;
export type StockCellContext<TData extends RowData, TValue = unknown> = CellContext<
  any,
  TData,
  TValue
>;
export type StockHeaderContext<TData extends RowData, TValue = unknown> = HeaderContext<
  any,
  TData,
  TValue
>;
export type StockFilterFn = FilterFn<any, any>;
