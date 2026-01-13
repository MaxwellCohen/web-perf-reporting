import React from 'react';
import { RenderMSValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import { RenderBytesValue } from '@/components/page-speed/lh-categories/table/RenderTableValue';
import { Row } from '@tanstack/react-table';

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
  const labelText = showAllDevices ? 'All Devices' : label;
  
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

    const uniqueLabels = [...new Set(validPairs.map((p) => p.label))];
    const uniqueValues = [...new Set(validPairs.map((p) => p.value))];
    
    // Check if all values are exactly the same
    if (uniqueValues.length === 1) {
      // If value is same for all reports, show each device on separate lines
      if (uniqueLabels.length > 1) {
        return (
          <div className="flex flex-col gap-1">
            {uniqueLabels.map((label, i) => (
              <ValueWithLabel
                key={i}
                value={renderValue(uniqueValues[0])}
                label={label}
              />
            ))}
          </div>
        );
      }
      // Single report, show the value with device label
      return (
        <ValueWithLabel
          value={renderValue(uniqueValues[0])}
          label={uniqueLabels[0]}
        />
      );
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
              <ValueWithLabel
                key={i}
                value={renderValue(uniqueRoundedValues[0])}
                label={label}
              />
            ))}
          </div>
        );
      }
      // Single device, show device label
      return (
        <ValueWithLabel
          value={renderValue(uniqueRoundedValues[0])}
          label={uniqueLabels[0]}
        />
      );
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
            <ValueWithLabel
              key={i}
              value={renderValue(value)}
              label={uniqueLabelsForValue.length === 1 ? uniqueLabelsForValue[0] : undefined}
            />
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
      // If value is same for all reports, show each device on separate lines
      if (showAllDevicesLabel && uniqueLabels.length > 1) {
        return (
          <div className="flex flex-col gap-1">
            {uniqueLabels.map((label, i) => (
              <ValueWithLabel
                key={i}
                value={<span>{value}</span>}
                label={label}
              />
            ))}
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
            <ValueWithLabel
              key={i}
              value={<span>{displayValue}</span>}
              label={showAllDevicesLabel && uniqueLabelsForValue.length === 1 ? uniqueLabelsForValue[0] : undefined}
            />
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
      // If value is same for all reports, show each device on separate lines
      if (uniqueLabels.length > 1) {
        return (
          <div className="flex flex-col gap-1">
            {uniqueLabels.map((label, i) => (
              <ValueWithLabel
                key={i}
                value={<span>{`${uniqueValues[0].toFixed(precision)}%`}</span>}
                label={label}
              />
            ))}
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
            <ValueWithLabel
              key={i}
              value={<span>{`${value.toFixed(precision)}%`}</span>}
              label={uniqueLabelsForValue.length === 1 ? uniqueLabelsForValue[0] : undefined}
            />
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

