import React from 'react';
import { RenderMSValue } from '../lh-categories/table/RenderTableValue';
import { RenderBytesValue } from '../lh-categories/table/RenderTableValue';
import { Row } from '@tanstack/react-table';

type ValueLabelPair<T> = {
  value: T;
  label: string;
};

/**
 * Extracts value and label pairs from leaf rows for a given column
 */
export function extractValueLabelPairs<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Row<any>,
  columnId: string,
  labelColumnId: string = 'label',
): ValueLabelPair<T>[] {
  const leafRows = row.getLeafRows();
  return leafRows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: Row<any>) => ({
      value: r.getValue(columnId) as T,
      label: r.getValue(labelColumnId) as string,
    }))
    .filter((v): v is ValueLabelPair<T> => {
      // Filter out undefined, null, and NaN values
      if (v.value === undefined || v.value === null) return false;
      if (typeof v.value === 'number' && (isNaN(v.value) || !isFinite(v.value))) return false;
      return true;
    });
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

    if (valueLabelPairs.length === 0) return 'N/A';

    // Additional safety check: filter out any NaN or invalid values that might have slipped through
    const validPairs = valueLabelPairs.filter((p) => {
      const val = p.value;
      return typeof val === 'number' && !isNaN(val) && isFinite(val);
    });

    if (validPairs.length === 0) return 'N/A';

    const uniqueValues = [...new Set(validPairs.map((p) => p.value))];
    const uniqueLabels = [...new Set(validPairs.map((p) => p.label))];
    
    if (uniqueValues.length === 1) {
      // If value is same for all reports, show "(All Devices)"
      if (uniqueLabels.length > 1) {
        return (
          <div className="flex items-center gap-2">
            {renderValue(uniqueValues[0])}
            <span className="text-xs text-muted-foreground">(All Devices)</span>
          </div>
        );
      }
      // Single report, just show the value
      return renderValue(uniqueValues[0]);
    }

    const valueGroups = new Map<number, string[]>();
    validPairs.forEach(({ value, label }) => {
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
              {renderValue(value)}
              {uniqueLabelsForValue.length === 1 && (
                <span className="text-xs text-muted-foreground">({uniqueLabelsForValue[0]})</span>
              )}
            </div>
          );
        })}
      </div>
    );
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
    const row = info.row;
    const valueLabelPairs = extractValueLabelPairs<string>(row, columnId);

    if (valueLabelPairs.length === 0) return 'N/A';

    const uniqueValues = [...new Set(valueLabelPairs.map((p) => p.value))];
    const uniqueLabels = [...new Set(valueLabelPairs.map((p) => p.label))];
    
    if (uniqueValues.length === 1) {
      const value = transformValue ? transformValue(uniqueValues[0]) : uniqueValues[0];
      // If value is same for all reports, show "(All Devices)" if enabled
      if (showAllDevicesLabel && uniqueLabels.length > 1) {
        return (
          <div className="flex items-center gap-2">
            <span>{value}</span>
            <span className="text-xs text-muted-foreground">(All Devices)</span>
          </div>
        );
      }
      // Single report or label disabled, just show the value
      return <span>{value}</span>;
    }

    const valueGroups = new Map<string, string[]>();
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
          const displayValue = transformValue ? transformValue(value) : value;
          return (
            <div key={i} className="flex items-center gap-2">
              <span>{displayValue}</span>
              {showAllDevicesLabel && uniqueLabelsForValue.length === 1 && (
                <span className="text-xs text-muted-foreground">({uniqueLabelsForValue[0]})</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
}

/**
 * Creates an aggregated cell renderer for percentage values
 */
export function createPercentageAggregatedCell(columnId: string, precision: number = 2) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const row = info.row;
    const valueLabelPairs = extractValueLabelPairs<number>(row, columnId);

    if (valueLabelPairs.length === 0) return 'N/A';

    const uniqueValues = [...new Set(valueLabelPairs.map((p) => p.value))];
    const uniqueLabels = [...new Set(valueLabelPairs.map((p) => p.label))];
    
    if (uniqueValues.length === 1) {
      // If value is same for all reports, show "(All Devices)"
      if (uniqueLabels.length > 1) {
        return (
          <div className="flex items-center gap-2">
            <span>{`${uniqueValues[0].toFixed(2)}%`}</span>
            <span className="text-xs text-muted-foreground">(All Devices)</span>
          </div>
        );
      }
      // Single report, just show the value
      return <span>{`${uniqueValues[0].toFixed(precision)}%`}</span>;
    }

    const valueGroups = new Map<number, string[]>();
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
              <span>{`${value.toFixed(precision)}%`}</span>
              {uniqueLabelsForValue.length === 1 && (
                <span className="text-xs text-muted-foreground">({uniqueLabelsForValue[0]})</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
}

/**
 * Creates an aggregated cell renderer for report labels
 */
export function createReportLabelAggregatedCell(labelColumnId: string = 'label') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/display-name
  return (info: any): React.ReactNode => {
    const row = info.row;
    const leafRows = row.getLeafRows();
    const values: string[] = leafRows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: Row<any>) => r.getValue(labelColumnId))
      .filter((v: unknown): v is string => typeof v === 'string');

    if (values.length === 0) return 'N/A';

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

