import React from 'react';

import { fireEvent } from '@testing-library/react';

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (v: string) => void;
}>({ value: '', onValueChange: () => {} });

const Tabs = ({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (v: string) => void;
  children?: React.ReactNode;
}) => (
  <TabsContext.Provider
    value={{ value: value ?? '', onValueChange: onValueChange ?? (() => {}) }}
  >
    <div data-orientation="horizontal" dir="ltr">
      {children}
    </div>
  </TabsContext.Provider>
);

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { className?: string }
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="tablist"
    className={className ? `inline-flex h-9 ${className}` : 'inline-flex h-9'}
    {...props}
  >
    {children}
  </div>
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ value, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext);
  return (
    <button
      ref={ref}
      role="tab"
      data-state={value === ctx.value ? 'active' : 'inactive'}
      onClick={() => ctx.onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ value, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext);
  return ctx.value === value ? (
    <div ref={ref} role="tabpanel" {...props}>
      {children}
    </div>
  ) : null;
});
TabsContent.displayName = 'TabsContent';

export const tabsMock = { Tabs, TabsList, TabsTrigger, TabsContent };

export const lucideMock = {
  AlertCircle: () => <span data-testid="alert-icon" />,
  FileJson: () => <span data-testid="file-json" />,
  Globe: () => <span data-testid="globe" />,
  Code: () => <span data-testid="code" />,
};

export const cardMock = {
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
};

export const inputMock = {
  Input: React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
    (props, ref) => <input ref={ref} {...props} />
  ),
};

export const textareaMock = {
  Textarea: React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<'textarea'>
  >((props, ref) => <textarea ref={ref} {...props} />),
};

export const buttonMock = {
  Button: React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
    ({ children, ...props }, ref) => (
      <button ref={ref} {...props}>
        {children}
      </button>
    )
  ),
};

export const labelMock = {
  Label: ({
    children,
    ...props
  }: React.ComponentProps<'label'>) => <label {...props}>{children}</label>,
};

export const alertMock = {
  Alert: ({ children }: { children: React.ReactNode }) => (
    <div role="alert">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
};

const Input = inputMock.Input;
const Button = buttonMock.Button;
const Label = labelMock.Label;
const Textarea = textareaMock.Textarea;

function LhTabListMock() {
  return (
    <TabsList className="mb-6 grid grid-cols-3">
      <TabsTrigger value="text" className="flex items-center gap-2">
        <span data-testid="code" />
        <span>Paste Lighthouse JSON</span>
      </TabsTrigger>
      <TabsTrigger value="file" className="flex items-center gap-2">
        <span data-testid="file-json" />
        <span>Upload Lighthouse JSON File</span>
      </TabsTrigger>
      <TabsTrigger value="url" className="flex items-center gap-2">
        <span data-testid="globe" />
        <span>Fetch via PageSpeed Insights API</span>
      </TabsTrigger>
    </TabsList>
  );
}

function LhTextInputMock({
  jsonInputs,
  setJsonInputs,
}: {
  jsonInputs: Array<{ name: string; content: string }>;
  setJsonInputs: React.Dispatch<
    React.SetStateAction<Array<{ name: string; content: string }>>
  >;
}) {
  return (
    <TabsContent value="text">
      <div>
        <Label>JSON Entries</Label>
        {jsonInputs.map((input, index) => (
          <div key={index}>
            <Label htmlFor={`json-name-${index}`}>Name:</Label>
            <Input
              id={`json-name-${index}`}
              placeholder="Entry name"
              value={input.name}
              onChange={(e) =>
                setJsonInputs((prev) => {
                  const u = [...prev];
                  u[index] = { ...u[index], name: e.target.value };
                  return u;
                })
              }
            />
            <Button
              type="button"
              onClick={() =>
                setJsonInputs((prev) => prev.filter((_, i) => i !== index))
              }
            >
              <span className="sr-only">Remove</span>
            </Button>
            <div>
              <Label htmlFor={`json-text-${index}`}>JSON Content</Label>
              <Textarea
                id={`json-text-${index}`}
                placeholder='{"example": "Paste your JSON here"}'
                value={input.content}
                onChange={(e) =>
                  setJsonInputs((prev) => {
                    const u = [...prev];
                    u[index] = { ...u[index], content: e.target.value };
                    return u;
                  })
                }
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          onClick={() =>
            setJsonInputs((prev) => [...prev, { name: '', content: '' }])
          }
        >
          Add Another JSON Entry
        </Button>
      </div>
    </TabsContent>
  );
}

function LhFileInputMock({
  jsonFiles,
  setJsonFiles,
}: {
  jsonFiles: Array<{ name: string; file: File }>;
  setJsonFiles: React.Dispatch<
    React.SetStateAction<Array<{ name: string; file: File }>>
  >;
}) {
  return (
    <TabsContent value="file">
      <div>
        <Label htmlFor="json-file">Upload JSON Files</Label>
        <Input
          id="json-file"
          type="file"
          accept=".json"
          onChange={(e) => {
            if (e.target.files?.length) {
              const newFiles = Array.from(e.target.files).map((file) => ({
                name: file.name.replace(/\.[^/.]+$/, ''),
                file,
              }));
              setJsonFiles((prev) => [...prev, ...newFiles]);
              e.target.value = '';
            }
          }}
          multiple
        />
        {jsonFiles.map((fileEntry, index) => (
          <div key={index}>
            <Input
              id={`file-name-${index}`}
              placeholder="Enter a name for this file"
              value={fileEntry.name}
              onChange={(e) =>
                setJsonFiles((prev) => {
                  const u = [...prev];
                  u[index] = { ...u[index], name: e.target.value };
                  return u;
                })
              }
            />
            <Button
              type="button"
              onClick={() =>
                setJsonFiles((prev) => prev.filter((_, i) => i !== index))
              }
            >
              <span className="sr-only">Remove</span>
            </Button>
          </div>
        ))}
      </div>
    </TabsContent>
  );
}

function LhUrlInputMock({
  jsonUrl,
  setJsonUrl,
}: {
  jsonUrl: string;
  setJsonUrl: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <TabsContent value="url">
      <div>
        <Label htmlFor="json-url">JSON URL</Label>
        <Input
          id="json-url"
          type="url"
          placeholder="https://example.com/data.json"
          value={jsonUrl}
          onChange={(e) => setJsonUrl(e.target.value)}
        />
      </div>
    </TabsContent>
  );
}

export const lhTabListMock = { LhTabList: LhTabListMock };
export const lhTextInputMock = { LhTextInput: LhTextInputMock };
export const lhFileInputMock = { LhFileInput: LhFileInputMock };
export const lhUrlInputMock = { LhUrlInput: LhUrlInputMock };

export function getTab(container: HTMLElement, name: string | RegExp) {
  return (
    Array.from(container.querySelectorAll('[role="tab"]')).find((t) =>
      typeof name === 'string'
        ? t.textContent?.trim() === name
        : name.test(t.textContent ?? '')
    ) ?? null
  );
}

export function getButton(container: HTMLElement, name: string | RegExp) {
  return (
    Array.from(container.querySelectorAll('button')).find((b) =>
      typeof name === 'string'
        ? b.textContent?.trim() === name
        : name.test(b.textContent ?? '')
    ) ?? null
  );
}

export function getAlert(container: HTMLElement) {
  return container.querySelector('[role="alert"]');
}

export function submitForm(container?: HTMLElement) {
  const root = container ?? document;
  const button = root.querySelector('button[type="submit"]');
  if (button) {
    fireEvent.click(button);
  } else {
    const form = root.querySelector('form');
    if (form) fireEvent.submit(form);
  }
}
