import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/page-speed/shared/TableCard', () => ({
  TableCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/page-speed/lh-categories/table/RenderTableValue', () => ({
  RenderMSValue: ({ value }: { value: number }) => <span>{value} ms</span>,
}));

vi.mock('@/components/page-speed/shared/tableConfigHelpers', () => ({
  useStandardTable: () => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    getRowCount: () => 0,
  }),
}));

vi.mock('@/components/page-speed/shared/tableColumnHelpers', () => ({
  createURLColumn: () => ({ id: 'url', header: 'URL', cell: () => null }),
  createReportColumn: () => ({ id: 'label', header: 'Report', cell: () => null }),
}));

import { BootupTimeCard } from '@/components/page-speed/javascript-metrics/BootupTimeCard';

describe('BootupTimeCard', () => {
  it('returns null when no metrics have bootupTime items', () => {
    const { container } = render(
      <BootupTimeCard
        metrics={[
          { label: 'Mobile', bootupTime: [] },
          { label: 'Desktop', bootupTime: [] },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card with bootup time table when data present', () => {
    const { container } = render(
      <BootupTimeCard
        metrics={[
          {
            label: 'Mobile',
            bootupTime: [
              {
                url: 'https://example.com/app.js',
                total: 100,
                scripting: 50,
                scriptParseCompile: 30,
              },
            ] as any,
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
