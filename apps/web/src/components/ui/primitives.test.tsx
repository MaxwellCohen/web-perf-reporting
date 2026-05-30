import * as React from "react";
import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron" />,
  Check: () => <span data-testid="check" />,
  ChevronRight: () => <span data-testid="chevron-right" />,
  Circle: () => <span data-testid="circle" />,
}));

vi.mock("@/components/ui/accordion", () => {
  const AccordionContext = React.createContext<{
    value: string[];
    onValueChange: (v: string[]) => void;
    type: "single" | "multiple";
  }>({ value: [], onValueChange: () => {}, type: "multiple" });
  const ItemValueContext = React.createContext<string>("");

  const Accordion = ({
    children,
    type = "multiple",
    defaultValue,
    value,
    onValueChange,
  }: {
    children?: React.ReactNode;
    type?: "single" | "multiple";
    defaultValue?: string | string[];
    value?: string | string[];
    onValueChange?: (v: string | string[]) => void;
  }) => {
    const [internal, setInternal] = React.useState<string[]>(() =>
      Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
    );
    const val = value !== undefined ? (Array.isArray(value) ? value : [value]) : internal;
    const setVal = (v: string[]) => {
      if (value === undefined) setInternal(v);
      onValueChange?.(type === "single" ? (v[0] ?? "") : v);
    };
    return (
      <AccordionContext.Provider value={{ value: val, onValueChange: setVal, type }}>
        <div data-accordion>{children}</div>
      </AccordionContext.Provider>
    );
  };

  const AccordionItem = ({
    children,
    value: itemValue,
  }: {
    children?: React.ReactNode;
    value: string;
  }) => (
    <ItemValueContext.Provider value={itemValue}>
      <div data-accordion-item={itemValue}>{children}</div>
    </ItemValueContext.Provider>
  );

  const AccordionTrigger = ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const ctx = React.useContext(AccordionContext);
    const itemValue = React.useContext(ItemValueContext);
    return (
      <button
        type="button"
        className={className}
        onClick={() => {
          const isOpen = ctx.value.includes(itemValue);
          const next = isOpen
            ? ctx.value.filter((x) => x !== itemValue)
            : ctx.type === "single"
              ? [itemValue]
              : [...ctx.value, itemValue];
          ctx.onValueChange(next);
        }}
      >
        {children}
      </button>
    );
  };

  const AccordionContent = ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const ctx = React.useContext(AccordionContext);
    const itemValue = React.useContext(ItemValueContext);
    const isOpen = ctx.value.includes(itemValue);
    if (!isOpen) return null;
    return <div className={className}>{children}</div>;
  };

  const AccordionTriggerSubgrid = AccordionTrigger;
  const AccordionContentSubgrid = AccordionContent;
  const Details = ({ children, ...props }: React.HTMLAttributes<HTMLDetailsElement>) => (
    <details open {...props}>
      {children}
    </details>
  );

  return {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    AccordionTriggerSubgrid,
    AccordionContentSubgrid,
    Details,
  };
});

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover">{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/checkbox", () => {
  const CheckboxMock = ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => {
    const [checked, setChecked] = React.useState(false);
    return (
      <button
        type="button"
        role="checkbox"
        aria-label={ariaLabel}
        aria-checked={checked ? "true" : "false"}
        onClick={() => setChecked((c) => !c)}
      />
    );
  };
  return { Checkbox: CheckboxMock };
});

vi.mock("@/components/ui/tabs", () => {
  const TabsContext = React.createContext<string>("");
  const TabsRoot = ({
    children,
    defaultValue,
  }: {
    children?: React.ReactNode;
    defaultValue?: string;
  }) => (
    <TabsContext.Provider value={defaultValue ?? ""}>
      <div data-tabs>{children}</div>
    </TabsContext.Provider>
  );
  const TabsList = ({ children }: { children?: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  );
  const TabsTrigger = ({ children, value }: { children?: React.ReactNode; value: string }) => (
    <button type="button" role="tab" data-value={value}>
      {children}
    </button>
  );
  const TabsContent = ({ children, value }: { children?: React.ReactNode; value: string }) => {
    const active = React.useContext(TabsContext);
    return active === value ? <div role="tabpanel">{children}</div> : null;
  };
  return { Tabs: TabsRoot, TabsList, TabsTrigger, TabsContent };
});

vi.mock("@/components/ui/navigation-menu", () => ({
  NavigationMenu: ({ children }: { children: React.ReactNode }) => <nav>{children}</nav>,
  NavigationMenuList: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  NavigationMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  NavigationMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  NavigationMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  NavigationMenuLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  NavigationMenuIndicator: () => null,
}));

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AccordionTriggerSubgrid,
  AccordionContentSubgrid,
  Details,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

describe("ui primitive smoke tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders alert variants and nested content", () => {
    const { container } = render(
      <Alert variant="destructive">
        <AlertTitle>Danger</AlertTitle>
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>,
    );
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass("text-destructive");
    expect(container.textContent).toContain("Danger");
  });

  it("renders badge, label, and textarea with forwarded props", () => {
    const { container } = render(
      <div>
        <Badge variant="secondary">Status</Badge>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Add notes" />
      </div>,
    );
    expect(container.firstChild).toMatchSnapshot();
    expect(container.querySelector("#notes")).toHaveAttribute("placeholder", "Add notes");
  });

  it("toggles the checkbox checked state", () => {
    const { container } = render(<Checkbox aria-label="Accept terms" />);

    const checkbox = container.querySelector('[role="checkbox"][aria-label="Accept terms"]');
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    fireEvent.click(checkbox!);

    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("renders the active tab content", () => {
    const { container } = render(
      <Tabs defaultValue="second">
        <TabsList>
          <TabsTrigger value="first">First</TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First content</TabsContent>
        <TabsContent value="second">Second content</TabsContent>
      </Tabs>,
    );
    expect(container.textContent).toContain("Second content");
  });

  it("opens a popover and renders navigation menu content", () => {
    const { container } = render(
      <div>
        <Popover>
          <PopoverTrigger>Open popover</PopoverTrigger>
          <PopoverContent>Popover body</PopoverContent>
        </Popover>
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="/docs">Read docs</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
          <NavigationMenuIndicator />
        </NavigationMenu>
      </div>,
    );
    const openBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Open popover",
    );
    fireEvent.click(openBtn!);
    const docsBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      /Docs/.test(b.textContent ?? ""),
    );
    fireEvent.click(docsBtn!);
    expect(container.textContent).toContain("Popover body");
    const link = container.querySelector('a[href="/docs"]');
    expect(link?.textContent).toContain("Read docs");
  });

  it("renders accordion trigger and content", () => {
    const { container } = render(
      <Accordion type="multiple">
        <AccordionItem value="item-1">
          <AccordionTrigger>First section</AccordionTrigger>
          <AccordionContent>First content</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const trigger = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "First section",
    );
    fireEvent.click(trigger!);
    expect(container.textContent).toContain("First content");
  });

  it("renders accordion subgrid variant and details", () => {
    const { container } = render(
      <div>
        <Accordion type="multiple">
          <AccordionItem value="item-2">
            <AccordionTriggerSubgrid>Second section</AccordionTriggerSubgrid>
            <AccordionContentSubgrid>Second content</AccordionContentSubgrid>
          </AccordionItem>
        </Accordion>
        <Details>
          <summary>Always open</summary>
          Details body
        </Details>
      </div>,
    );
    const trigger = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Second section",
    );
    fireEvent.click(trigger!);
    expect(container.textContent).toContain("Second content");
    expect(container.textContent).toContain("Details body");
  });

  it("renders the full table primitive set together", () => {
    const { container } = render(
      <Table wrapperClassName="table-wrapper">
        <TableCaption>Quarterly results</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>LCP</TableCell>
            <TableCell>2.1s</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Total</TableCell>
            <TableCell>1 metric</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    expect(container.textContent).toContain("Quarterly results");
    expect(container.firstChild).toMatchSnapshot();
  });
});
