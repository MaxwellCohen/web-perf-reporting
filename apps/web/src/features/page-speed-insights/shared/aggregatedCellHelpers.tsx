import React from "react";
import { RenderMSValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { RenderBytesValue } from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";
import { Row } from "@tanstack/react-table";

type ValueLabelPair<T> = {
  value: T;
  label: string;
};

/**
 * Component to display a value with an optional device label
 */
function ValueWithLabel({
  value,
  label,
  showAllDevices = false,
}: {
  value: React.ReactNode;
  label?: string;
  showAllDevices?: boolean;
}) {
  const labelText = showAllDevices ? "All Devices" : label;

  if (!labelText) {
    return <>{value}</>;
  }

  return (
    <div className="flex items-center gap-2 basis-full">
      {value}
      <span className="text-xs text-muted-foreground">({labelText})</span>
    </div>
  );
}

/**
 * Extracts value and label pairs from leaf rows for a given column
 */
export function extractValueLabelPairs<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>,
  columnId: string,
  labelColumnId: string = "label",
): ValueLabelPair<T>[] {
  const leafRows = row.getLeafRows();
  return (
    leafRows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: Row<any>) => {
        const label =
          (r.original as { label?: string }).label ?? (r.getValue(labelColumnId) as string);
        return {
          value: r.getValue(columnId) as T,
          label,
        };
      })
      .filter((v): v is ValueLabelPair<T> => {
        // Filter out undefined, null, and NaN values
        if (v.value === undefined || v.value === null) return false;
        if (typeof v.value === "number" && (isNaN(v.value) || !isFinite(v.value))) return false;
        return true;
      })
  );
}

function valueLabelUniquesOrNull<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>,
  columnId: string,
): {
  valueLabelPairs: ValueLabelPair<T>[];
  uniqueValues: T[];
  uniqueLabels: string[];
} | null {
  const valueLabelPairs = extractValueLabelPairs<T>(row, columnId);
  if (valueLabelPairs.length === 0) return null;
  return {
    valueLabelPairs,
    uniqueValues: [...new Set(valueLabelPairs.map((p) => p.value))],
    uniqueLabels: [...new Set(valueLabelPairs.map((p) => p.label))],
  };
}

function mapLabelsToRows(
  uniqueLabels: string[],
  renderRow: (label: string, index: number) => React.ReactNode,
) {
  return (
    <div className="flex flex-col gap-1">
      {uniqueLabels.map((label, i) => (
        <React.Fragment key={i}>{renderRow(label, i)}</React.Fragment>
      ))}
    </div>
  );
}

/** When every leaf shares one value, optionally show one row per device label. */
function singleUniqueValueAggregatedBranch<T>(
  uniqueValues: T[],
  uniqueLabels: string[],
  splitAcrossDevices: boolean,
  renderLabeledRow: (value: T, label: string) => React.ReactNode,
  renderSolo: (value: T) => React.ReactNode,
): React.ReactNode | undefined {
  if (uniqueValues.length !== 1) return undefined;
  const only = uniqueValues[0];
  if (splitAcrossDevices && uniqueLabels.length > 1) {
    return mapLabelsToRows(uniqueLabels, (label) => renderLabeledRow(only, label));
  }
  return renderSolo(only);
}

function getAggregatedValueLabelContext<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: any,
  columnId: string,
) {
  const uniques = valueLabelUniquesOrNull<T>(info.row, columnId);
  if (!uniques) return null;
  return uniques;
}

function groupValueLabelPairs<T>(pairs: ValueLabelPair<T>[]): Map<T, string[]> {
  const valueGroups = new Map<T, string[]>();
  pairs.forEach(({ value, label }) => {
    if (!valueGroups.has(value)) {
      valueGroups.set(value, []);
    }
    valueGroups.get(value)!.push(label);
  });
  return valueGroups;
}

function scrollableValueWithLabelGroups<T>(
  valueGroups: Map<T, string[]>,
  renderInner: (value: T) => React.ReactNode,
  options?: { resolveLabel?: (uniqueLabels: string[]) => string | undefined },
) {
  const resolveLabel =
    options?.resolveLabel ??
    ((unique: string[]) => (unique.length === 1 ? unique[0] : undefined));
  return (
    <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
      {Array.from(valueGroups.entries()).map(([value, labels], i) => {
        const uniqueLabelsForValue = [...new Set(labels)];
        return (
          <ValueWithLabel
            key={i}
            value={renderInner(value)}
            label={resolveLabel(uniqueLabelsForValue)}
          />
        );
      })}
    </div>
  );
}

/**
 * Creates an aggregated cell renderer for numeric values (milliseconds)
 */
export function createNumericAggregatedCell(
  columnId: string,
  renderValue: (value: number) => React.ReactNode = (value) => <RenderMSValue value={value} />,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const row = info.row;
    const valueLabelPairs = extractValueLabelPairs<number>(row, columnId);

    if (valueLabelPairs.length === 0) return "N/A";

    // Additional safety check: filter out any NaN or invalid values that might have slipped through
    const validPairs = valueLabelPairs.filter((p) => {
      const val = p.value;
      return typeof val === "number" && !isNaN(val) && isFinite(val);
    });

    if (validPairs.length === 0) return "N/A";

    const uniqueLabels = [...new Set(validPairs.map((p) => p.label))];
    const uniqueValues = [...new Set(validPairs.map((p) => p.value))];

    // Check if all values are exactly the same
    if (uniqueValues.length === 1) {
      // If value is same for all reports, show each device on separate lines
      if (uniqueLabels.length > 1) {
        return (
          <div className="flex flex-col gap-1">
            {uniqueLabels.map((label, i) => (
              <ValueWithLabel key={i} value={renderValue(uniqueValues[0])} label={label} />
            ))}
          </div>
        );
      }
      // Single report, show the value with device label
      return <ValueWithLabel value={renderValue(uniqueValues[0])} label={uniqueLabels[0]} />;
    }

    // If values are not exactly the same, check if they round to the same value
    // This handles cases where values like 4.0 and 4.1 both display as "4 ms"
    const roundedValues = validPairs.map((p) => Math.round(p.value));
    const uniqueRoundedValues = [...new Set(roundedValues)];

    if (uniqueRoundedValues.length === 1) {
      // All values round to the same number
      if (uniqueLabels.length > 1) {
        // Multiple devices, show each device on separate lines
        return (
          <div className="flex flex-col gap-1">
            {uniqueLabels.map((label, i) => (
              <ValueWithLabel key={i} value={renderValue(uniqueRoundedValues[0])} label={label} />
            ))}
          </div>
        );
      }
      // Single device, show device label
      return <ValueWithLabel value={renderValue(uniqueRoundedValues[0])} label={uniqueLabels[0]} />;
    }

    const valueGroups = groupValueLabelPairs(validPairs);

    return scrollableValueWithLabelGroups(valueGroups, (value) => renderValue(value));
  };
}

/**
 * Creates an aggregated cell renderer for byte values
 */
export function createBytesAggregatedCell(columnId: string) {
  return createNumericAggregatedCell(columnId, (value) => <RenderBytesValue value={value} />);
}

/**
 * Creates an aggregated cell renderer for string values
 * @param columnId - The column ID to extract values from
 * @param transformValue - Optional function to transform the value before display
 * @param showAllDevicesLabel - Whether to show "(All Devices)" label when value is same across all reports (default: true)
 */
export function createStringAggregatedCell(
  columnId: string,
  transformValue?: (value: string) => string,
  showAllDevicesLabel: boolean = true,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const uniques = getAggregatedValueLabelContext<string>(info, columnId);
    if (!uniques) return "N/A";

    const { valueLabelPairs, uniqueValues, uniqueLabels } = uniques;

    const singleBranch = singleUniqueValueAggregatedBranch(
      uniqueValues,
      uniqueLabels,
      showAllDevicesLabel,
      (only, label) => {
        const value = transformValue ? transformValue(only) : only;
        return <ValueWithLabel value={<span>{value}</span>} label={label} />;
      },
      (only) => <span>{transformValue ? transformValue(only) : only}</span>,
    );
    if (singleBranch !== undefined) return singleBranch;

    const valueGroups = groupValueLabelPairs(valueLabelPairs);

    return scrollableValueWithLabelGroups(
      valueGroups,
      (value) => <span>{transformValue ? transformValue(value) : value}</span>,
      {
        resolveLabel: (unique) =>
          showAllDevicesLabel && unique.length === 1 ? unique[0] : undefined,
      },
    );
  };
}

/**
 * Creates an aggregated cell renderer for percentage values
 */
export function createPercentageAggregatedCell(columnId: string, precision: number = 2) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const uniques = getAggregatedValueLabelContext<number>(info, columnId);
    if (!uniques) return "N/A";

    const { valueLabelPairs, uniqueValues, uniqueLabels } = uniques;

    const singleBranch = singleUniqueValueAggregatedBranch(
      uniqueValues,
      uniqueLabels,
      true,
      (only, label) => (
        <ValueWithLabel
          value={<span>{`${only.toFixed(precision)}%`}</span>}
          label={label}
        />
      ),
      (only) => <span>{`${only.toFixed(precision)}%`}</span>,
    );
    if (singleBranch !== undefined) return singleBranch;

    const valueGroups = groupValueLabelPairs(valueLabelPairs);

    return scrollableValueWithLabelGroups(valueGroups, (value) => (
      <span>{`${value.toFixed(precision)}%`}</span>
    ));
  };
}

/**
 * Creates an aggregated cell renderer for report labels
 */
export function createReportLabelAggregatedCell(labelColumnId: string = "label") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const row = info.row;
    const leafRows = row.getLeafRows();
    const values: string[] = leafRows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: Row<any>) => r.getValue(labelColumnId))
      .filter((v: unknown): v is string => typeof v === "string");

    if (values.length === 0) return "N/A";

    const uniqueValues: string[] = Array.from(new Set(values));
    if (uniqueValues.length === 1) {
      return <span>{uniqueValues[0]}</span>;
    }

    return (
      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
        {uniqueValues.map((v, i) => (
          <span key={i}>{v}</span>
        ))}
      </div>
    );
  };
}

/**
 * Aggregated cell for boolean columns in multi-report grouped tables.
 */
export function createBooleanAggregatedCell<TData>(
  columnId: string,
  renderBoolean: (value: boolean) => React.ReactNode,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const row = info.row as Row<TData>;
    const uniques = valueLabelUniquesOrNull<boolean>(row, columnId);
    if (!uniques) return "N/A";

    const { valueLabelPairs, uniqueValues, uniqueLabels } = uniques;

    if (uniqueValues.length === 1) {
      const value = uniqueValues[0];
      if (uniqueLabels.length > 1) {
        return (
          <div className="flex items-center gap-2">
            {renderBoolean(value)}
            <span className="text-muted-foreground text-xs">(All Devices)</span>
          </div>
        );
      }
      return renderBoolean(value);
    }

    const valueGroups = groupValueLabelPairs(valueLabelPairs);

    return (
      <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
        {Array.from(valueGroups.entries()).map(([value, labels], i) => {
          const uniqueLabelsForValue = [...new Set(labels)];
          return (
            <div key={i} className="flex items-center gap-2">
              {renderBoolean(value)}
              {uniqueLabelsForValue.length === 1 && (
                <span className="text-muted-foreground text-xs">({uniqueLabelsForValue[0]})</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
}

/**
 * Aggregated cell that unions unique origin strings from leaf rows.
 */
export function createOriginsArrayAggregatedCell<TData>(originsColumnId: string = "origins") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const row = info.row as Row<TData>;
    const leafRows = row.getLeafRows();
    const allOrigins: string[] = [];

    leafRows.forEach((r: Row<TData>) => {
      const origins = r.getValue(originsColumnId) as string[];
      if (Array.isArray(origins)) {
        allOrigins.push(...origins);
      }
    });

    if (allOrigins.length === 0) return "N/A";

    const uniqueOrigins = [...new Set(allOrigins)];

    return (
      <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
        {uniqueOrigins.map((origin) => (
          <div key={origin}>{origin}</div>
        ))}
      </div>
    );
  };
}
