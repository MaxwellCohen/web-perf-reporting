import { describe, expect, it } from 'vitest';
import { chartConfig } from '@/components/common/ChartSettings';

describe('ChartSettings', () => {
  it('exports the expected chart labels and colors', () => {
    expect(chartConfig.P75.label).toBe('P75');
    expect(chartConfig.good_density.color).toBe('hsl(var(--chart-1))');
    expect(chartConfig.ni_density.label).toBe('Needs Improvement');
    expect(chartConfig.poor_density.label).toBe('Poor');
  });
});
