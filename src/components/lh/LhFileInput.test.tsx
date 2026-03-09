import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/tabs', () => ({
  TabsContent: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div role="tabpanel" data-value={value}>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>((props, ref) => (
    <input ref={ref} {...props} />
  )),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.ComponentProps<'label'>) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(({ children, ...props }, ref) => (
    <button ref={ref} {...props}>{children}</button>
  )),
}));

vi.mock('lucide-react', () => ({
  FileJson: () => <span data-testid="file-json" />,
}));

import { LhFileInput } from '@/components/lh/LhFileInput';

describe('LhFileInput', () => {
  it('renders file upload input when no files', () => {
    const setJsonFiles = vi.fn();
    const { container } = render(<LhFileInput jsonFiles={[]} setJsonFiles={setJsonFiles} />);
    expect(container.textContent).toContain('Upload JSON Files');
    expect(container.querySelector('#json-file')).toHaveAttribute('type', 'file');
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders uploaded files when present', () => {
    const setJsonFiles = vi.fn();
    const file = new File(['{}'], 'report.json', { type: 'application/json' });
    const { container } = render(
      <LhFileInput jsonFiles={[{ name: 'Report', file }]} setJsonFiles={setJsonFiles} />,
    );
    expect(container.textContent).toContain('Uploaded Files');
    expect(container.textContent).toContain('report.json');
    expect(container.querySelector('input[placeholder="Enter a name for this file"]')).toHaveValue('Report');
  });

  it('calls setJsonFiles when file selected', () => {
    const setJsonFiles = vi.fn();
    const { container } = render(<LhFileInput jsonFiles={[]} setJsonFiles={setJsonFiles} />);
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    fireEvent.change(container.querySelector('#json-file')!, { target: { files: [file] } });
    expect(setJsonFiles).toHaveBeenCalled();
  });

  it('calls setJsonFiles when file name changed', () => {
    const setJsonFiles = vi.fn();
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    const { container } = render(
      <LhFileInput jsonFiles={[{ name: 'A', file }]} setJsonFiles={setJsonFiles} />,
    );
    fireEvent.change(container.querySelector('input[placeholder="Enter a name for this file"]')!, {
      target: { value: 'Custom' },
    });
    expect(setJsonFiles).toHaveBeenCalled();
  });

  it('calls setJsonFiles when remove clicked', () => {
    const setJsonFiles = vi.fn();
    const file = new File(['{}'], 'a.json', { type: 'application/json' });
    const { container } = render(
      <LhFileInput jsonFiles={[{ name: 'A', file }]} setJsonFiles={setJsonFiles} />,
    );
    const removeBtn = container.querySelectorAll('button')[0];
    fireEvent.click(removeBtn!);
    expect(setJsonFiles).toHaveBeenCalled();
  });
});
