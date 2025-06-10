import { Header, Table } from '@tanstack/react-table';
import clsx from 'clsx';
import { useMemo } from 'react';

export function ColumnResizer<T>({ header }: { header: Header<T, unknown> }) {
  if (header.column.columnDef.enableResizing === false) {
    return null;
  }
  const handler = header.getResizeHandler();
  return (
    <div
      onDoubleClick={() => header.column.resetSize()}
      onMouseDown={handler}
      onTouchStart={handler}
      className={clsx(
        'absolute right-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none bg-muted/50 transition-opacity duration-200',
        {
          'bg-muted': header.column.getIsResizing(),
        },
      )}
    />
  );
}

export function useColumnSizeVars<T>(table: Table<T>) {
  'use no memo';
  /**
   * Instead of calling `column.getSize()` on every render for every header
   * and especially every data cell (very expensive),
   * we will calculate all column sizes at once at the root table level in a useMemo
   * and pass the column sizes down as CSS variables to the <table> element.
   */
  const flatHeaders = table.getFlatHeaders();
  const columnSizeVars = useMemo(() => {
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < flatHeaders.length; i++) {
      const header = flatHeaders[i]!;
      colSizes[`--header-${header.id}-size`] = header.getSize();
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
  }, [flatHeaders]);

  return columnSizeVars;
}
