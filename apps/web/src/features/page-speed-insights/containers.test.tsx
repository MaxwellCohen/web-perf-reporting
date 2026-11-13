import React from "react";

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Accordion } from "@/components/ui/accordion";

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
  ListFilter: () => <span data-testid="list-filter" />,
  ArrowUp: () => <span data-testid="arrow-up" />,
  ArrowLeft: () => <span data-testid="arrow-left" />,
  ArrowRight: () => <span data-testid="arrow-right" />,
  ChevronRightIcon: () => <span data-testid="chevron-right" />,
  MinusIcon: () => <span data-testid="minus" />,
  Copy: () => <span data-testid="copy" />,
  TriangleAlert: () => <span data-testid="triangle-alert" />,
}));

vi.mock("@/components/ui/accordion", () => {
  const AccordionContext = React.createContext<{
    value: string[];
    onValueChange: (v: string[]) => void;
    type: "single" | "multiple";
  }>({ value: [], onValueChange: () => {}, type: "multiple" });
  const ItemValueContext = React.createContext<string>("");

  const AccordionRoot = ({
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
      <div data-accordion-item={itemValue} data-value={itemValue}>
        {children}
      </div>
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

  return {
    Accordion: AccordionRoot,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
  };
});

let pageSpeedItems: any[] = [];

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: () => pageSpeedItems,
  usePageSpeedSelector: (selector: (snapshot: { context: unknown }) => unknown) => {
    return selector({
      context: {
        items: pageSpeedItems,
        data: [],
        labels: [],
        isLoading: false,
        reportTitle: "",
        fullPageScreenshots: {},
      },
    });
  },
}));

vi.mock("@/components/common/PageSpeedGaugeChart", () => ({
  HorizontalGaugeChart: ({ metric }: { metric: string }) => <div>{metric}</div>,
  HorizontalScoreChart: ({ score }: { score: number }) => <div>Score chart: {score}</div>,
}));

import { CWVMetricsComponent } from "@/features/page-speed-insights/CWVMetricsComponent";
import { LoadingExperience } from "@/features/page-speed-insights/loading-experience/LoadingExperience";

describe("page-speed container coverage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pageSpeedItems = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when LoadingExperience has no items", () => {
    pageSpeedItems = [];

    const { container } = render(
      <Accordion type="multiple">
        <LoadingExperience title="Page Loading Experience" experienceKey="loadingExperience" />
      </Accordion>,
    );

    expect(container.querySelector('[value="loadingExperience"]')).toBeNull();
  });

  it("returns null when LoadingExperience items have no experience data", () => {
    pageSpeedItems = [
      { label: "Mobile", item: {} },
      { label: "Desktop", item: { lighthouseResult: {} } },
    ];

    const { container } = render(
      <Accordion type="multiple">
        <LoadingExperience title="Page Loading Experience" experienceKey="loadingExperience" />
      </Accordion>,
    );

    expect(container.querySelector('[value="loadingExperience"]')).toBeNull();
  });

  it("renders the loading experience gauges for available metrics", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          loadingExperience: {
            overall_category: "FAST",
            metrics: {
              FIRST_CONTENTFUL_PAINT_MS: {
                percentile: 1200,
                category: "FAST",
              },
              LARGEST_CONTENTFUL_PAINT_MS: {
                percentile: 2200,
                category: "AVERAGE",
              },
            },
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple" defaultValue={["loadingExperience"]}>
        <LoadingExperience title="Page Loading Experience" experienceKey="loadingExperience" />
      </Accordion>,
    );

    expect(container.textContent).toMatch(/Page Loading Experience:\s*Mobile - FAST/);
    expect(container.textContent).toContain("1200 - FAST (Mobile)");
    expect(container.textContent).toContain("2200 - AVERAGE (Mobile)");
  });

  it("returns null when no items have metric audits", () => {
    pageSpeedItems = [
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            audits: {},
          },
        },
      },
    ];

    const { container } = render(
      <Accordion type="multiple">
        <CWVMetricsComponent />
      </Accordion>,
    );

    expect(container.querySelector('[value="cwv"]')).toBeNull();
  });
});
