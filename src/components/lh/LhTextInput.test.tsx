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

vi.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>((props, ref) => (
    <textarea ref={ref} {...props} />
  )),
}));

vi.mock('@/components/ui/button', () => ({
  Button: React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(({ children, ...props }, ref) => (
    <button ref={ref} {...props}>{children}</button>
  )),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: React.ComponentProps<'label'>) => <label {...props}>{children}</label>,
}));

import { LhTextInput } from '@/components/lh/LhTextInput';

function getButton(container: HTMLElement, name: string | RegExp) {
  return Array.from(container.querySelectorAll('button')).find((b) =>
    typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? ''),
  ) ?? null;
}

describe('LhTextInput', () => {
  it('renders default state with one entry', () => {
    const setJsonInputs = vi.fn();
    const { container } = render(
      <LhTextInput jsonInputs={[{ name: '', content: '' }]} setJsonInputs={setJsonInputs} />,
    );
    expect(container.textContent).toContain('JSON Entries');
    expect(container.querySelector('input[placeholder="Entry name"]')).toBeTruthy();
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Add Another JSON Entry button', () => {
    const setJsonInputs = vi.fn();
    const { container } = render(
      <LhTextInput jsonInputs={[{ name: '', content: '' }]} setJsonInputs={setJsonInputs} />,
    );
    expect(getButton(container, 'Add Another JSON Entry')).toBeTruthy();
  });

  it('calls setJsonInputs when add button clicked', () => {
    const setJsonInputs = vi.fn();
    const { container } = render(
      <LhTextInput jsonInputs={[{ name: '', content: '' }]} setJsonInputs={setJsonInputs} />,
    );
    fireEvent.click(getButton(container, 'Add Another JSON Entry')!);
    expect(setJsonInputs).toHaveBeenCalled();
  });

  it('calls setJsonInputs when remove clicked', () => {
    const setJsonInputs = vi.fn();
    const { container } = render(
      <LhTextInput jsonInputs={[{ name: 'A', content: '{}' }]} setJsonInputs={setJsonInputs} />,
    );
    const removeBtn = container.querySelector('button[class*="absolute"]');
    fireEvent.click(removeBtn!);
    expect(setJsonInputs).toHaveBeenCalled();
  });

  it('calls setJsonInputs when name or content changed', () => {
    const setJsonInputs = vi.fn();
    const { container } = render(
      <LhTextInput jsonInputs={[{ name: '', content: '' }]} setJsonInputs={setJsonInputs} />,
    );
    fireEvent.change(container.querySelector('input[placeholder="Entry name"]')!, {
      target: { value: 'Test' },
    });
    expect(setJsonInputs).toHaveBeenCalled();
  });
});
