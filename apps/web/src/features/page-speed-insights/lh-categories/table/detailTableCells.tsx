import { Fragment, type ReactElement } from "react";
import type { ItemValue, TableColumnHeading } from "@/lib/schema";
import type { StockCellContext } from "@/features/page-speed-insights/shared/tanstackStockTypes";
import { RenderTableValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import type { DetailTableDataRow } from "@/features/page-speed-insights/lh-categories/table/detailTableData";
import type { DeviceValuePair } from "@/features/page-speed-insights/lh-categories/table/detailTableColumnTypes";

/**
 * Gets the user label from column meta or row original data
 */
const getUserLabel = (info: StockCellContext<DetailTableDataRow, unknown>): string => {
  const metaLabel = info.column.columnDef.meta?.heading?._userLabel;
  if (metaLabel) {
    return metaLabel;
  }
  return info.row.original._userLabel || "";
};

/**
 * Checks if value is an array of device-value pairs
 */
export const isDeviceValuePairArray = (value: unknown): value is DeviceValuePair[] => {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (v): v is DeviceValuePair =>
        Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && typeof v[1] === "number",
    )
  );
};

/**
 * Cell values are typed `unknown` because aggregation may yield arrays or device/value pairs;
 * by the time a leaf reaches a renderer it is the Lighthouse item value it came from.
 */
export const asItemValue = (value: unknown): ItemValue => value as ItemValue;

/**
 * Renders a single value with optional device label
 */
const renderValueWithLabel = (
  value: ItemValue,
  heading: TableColumnHeading | undefined,
  device: string,
  showLabel = false,
): ReactElement => {
  return (
    <div>
      <RenderTableValue value={value} heading={heading} device={device} />
      {showLabel && device && <span className="text-xs text-muted-foreground"> ({device})</span>}
    </div>
  );
};

/**
 * Renders device-value pairs (aggregated data from multiple devices)
 */
const renderDeviceValuePairs = (
  pairs: DeviceValuePair[],
  heading: TableColumnHeading | undefined,
): ReactElement => {
  if (pairs.length === 0) {
    return <></>;
  }

  // If there's only one device, show that device's name
  if (pairs.length === 1) {
    return (
      <>
        <RenderTableValue value={pairs[0][1]} heading={heading} device={pairs[0][0]} />
        <span className="text-xs text-muted-foreground"> ({pairs[0][0]})</span>
      </>
    );
  }

  // Render each device-value pair on separate lines
  return (
    <div className="flex flex-col gap-1">
      {pairs.map(([device, val], i) => (
        <div key={i}>{renderValueWithLabel(val, heading, device, pairs.length > 1)}</div>
      ))}
    </div>
  );
};

/**
 * Renders sub-rows values when array has less than 2 items
 */
const renderSubRowValues = (
  info: StockCellContext<DetailTableDataRow, unknown>,
  key: string,
  heading: TableColumnHeading | undefined,
): (ReactElement | null)[] => {
  return info.row.subRows.map((sr, i) => {
    const srItem = sr.getValue(key);
    const srUserLabel = (sr.getValue("device") as string) || "";

    if (srItem === undefined || srItem === "") {
      return null;
    }

    if (heading?.valueType === "node") {
      return null;
    }

    return (
      <Fragment key={i}>
        {renderValueWithLabel(asItemValue(srItem), heading, srUserLabel, true)}
      </Fragment>
    );
  });
};

/**
 * Main cell renderer for table cells
 */
export const detailTableCell = (info: StockCellContext<DetailTableDataRow, unknown>) => {
  const value = info.getValue();
  const key = info.column.id;
  const heading = info.column.columnDef.meta?.heading?.heading;
  const _userLabel = getUserLabel(info);
  const rowDepth = info.row.depth;
  // Show device label for sub-rows (depth > 0) in grouped tables, but not for the device column itself
  const showDeviceLabel = rowDepth > 0 && _userLabel && key !== "device";

  // Handle non-array values
  if (!Array.isArray(value)) {
    if (showDeviceLabel) {
      return renderValueWithLabel(asItemValue(value), heading, _userLabel, true);
    }
    return <RenderTableValue value={asItemValue(value)} heading={heading} device={_userLabel} />;
  }

  // Handle device-value pair arrays (aggregated data)
  if (isDeviceValuePairArray(value)) {
    return renderDeviceValuePairs(value, heading);
  }

  // Handle single-item arrays
  if (value.length === 1) {
    if (showDeviceLabel) {
      return renderValueWithLabel(asItemValue(value[0]), heading, _userLabel, true);
    }
    return <RenderTableValue value={asItemValue(value[0])} heading={heading} device={_userLabel} />;
  }

  // Handle arrays with sub-rows (length < 2 means empty or single, but check subRows)
  if (value.length < 2 && info.row.subRows.length > 0) {
    return renderSubRowValues(info, key, heading);
  }

  // For other array cases, return null
  return null;
};

/**
 * Cell renderer for device/user label column
 */
export function DeviceCell(info: StockCellContext<DetailTableDataRow, unknown>) {
  const value = info.getValue();

  if (Array.isArray(value)) {
    return (
      <>
        {value
          .filter((v) => v != null && v !== "")
          .map((v, i) => (
            <div key={i}>{String(v)}</div>
          ))}
      </>
    );
  }
  return <>{String(value)}</>;
}
