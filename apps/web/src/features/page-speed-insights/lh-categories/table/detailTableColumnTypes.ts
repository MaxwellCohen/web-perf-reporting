import type { RowData } from "@tanstack/react-table";
import type { TableFeatures } from "@tanstack/table-core";
import type { TableColumnHeading } from "@/lib/schema";

export type ColumnHeadingConfig = {
  heading: TableColumnHeading;
  _userLabel: string;
  skipSumming?: string[];
};

export type DeviceValuePair = [string, number];

declare module "@tanstack/table-core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures extends TableFeatures, TData extends RowData, TValue> {
    heading?: { heading: TableColumnHeading; _userLabel?: string };
    defaultVisibility?: boolean;
    rowType?: "main" | "sub";
    headerType?: "group" | "sub";
  }
}
