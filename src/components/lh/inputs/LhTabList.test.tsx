import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  Code: () => <span data-testid="code" />,
  FileJson: () => <span data-testid="file-json" />,
  Globe: () => <span data-testid="globe" />,
}));

vi.mock('@/components/ui/tabs', () => ({
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div role="tablist" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button role="tab" data-value={value}>
      {children}
    </button>
  ),
}));

import { LhTabList } from '@/components/lh/inputs/LhTabList';

describe('LhTabList', () => {
  it('renders three tabs', () => {
    const { container } = render(<LhTabList />);
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
    expect(container.textContent).toContain('Paste Lighthouse JSON');
    expect(container.textContent).toContain('Upload Lighthouse JSON File');
    expect(container.textContent).toContain('Fetch via PageSpeed Insights API');
  });

  it('renders snapshot', () => {
    const { container } = render(<LhTabList />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
