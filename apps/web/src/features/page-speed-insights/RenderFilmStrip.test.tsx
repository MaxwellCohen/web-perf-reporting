import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Accordion } from "@/components/ui/accordion";
import { PageSpeedInsightsProvider } from "@/features/page-speed-insights/PageSpeedContext";
import { RenderFilmStrip } from "@/features/page-speed-insights/RenderFilmStrip";

vi.mock("@/components/ui/accordion", () => {
  const ItemValueContext = React.createContext<string>("");
  const AccordionContext = React.createContext<{
    value: string[];
    onValueChange: (v: string[]) => void;
    type: string;
  }>({ value: [], onValueChange: () => {}, type: "single" });
  const AccordionRoot = ({
    children,
    type = "single",
    defaultValue,
  }: {
    children?: React.ReactNode;
    type?: string;
    defaultValue?: string | string[];
  }) => {
    const [val, setVal] = React.useState<string[]>(() =>
      Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : [],
    );
    return (
      <AccordionContext.Provider value={{ value: val, onValueChange: setVal, type }}>
        <div>{children}</div>
      </AccordionContext.Provider>
    );
  };
  const AccordionItem = ({ children, value: v }: { children?: React.ReactNode; value: string }) => (
    <ItemValueContext.Provider value={v}>
      <div>{children}</div>
    </ItemValueContext.Provider>
  );
  const AccordionTrigger = ({ children }: { children?: React.ReactNode }) => {
    const ctx = React.useContext(AccordionContext);
    const v = React.useContext(ItemValueContext);
    return (
      <button type="button" onClick={() => ctx.onValueChange(ctx.value.includes(v) ? [] : [v])}>
        {children}
      </button>
    );
  };
  const AccordionContent = ({ children }: { children?: React.ReactNode }) => {
    const ctx = React.useContext(AccordionContext);
    const v = React.useContext(ItemValueContext);
    return ctx.value.includes(v) ? <div>{children}</div> : null;
  };
  return { Accordion: AccordionRoot, AccordionItem, AccordionTrigger, AccordionContent };
});

vi.mock("@/features/page-speed-insights/Timeline", async () => {
  const actual = await vi.importActual<typeof import("@/features/page-speed-insights/Timeline")>(
    "@/features/page-speed-insights/Timeline",
  );
  return {
    Timeline: (props: React.ComponentProps<typeof actual.Timeline>) => {
      const { device, timeline, markers } = props;
      return (
        <div
          data-timeline
          data-device={device}
          data-timings={timeline?.items?.map((item) => item.timing).join(",") ?? ""}
          data-markers={
            markers?.map((marker) => `${marker.label}:${Math.round(marker.timeMs)}`).join(",") ?? ""
          }
        >
          <actual.Timeline {...props} />
        </div>
      );
    },
  };
});

function TestWrapper({
  children,
  data,
  labels,
}: {
  children: React.ReactNode;
  data: any[];
  labels: string[];
}) {
  return (
    <PageSpeedInsightsProvider data={data} labels={labels}>
      <Accordion type="single" collapsible>
        {children}
      </Accordion>
    </PageSpeedInsightsProvider>
  );
}

describe("RenderFilmStrip", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns null when no screenshot thumbnails in items", () => {
    const data = [
      {
        lighthouseResult: {
          audits: {},
        },
      },
    ];
    render(
      <TestWrapper data={data} labels={["Mobile"]}>
        <RenderFilmStrip />
      </TestWrapper>,
    );
    expect(screen.queryByText("Screenshots")).toBeNull();
  });

  it("returns null when screenshot-thumbnails details is not filmstrip type", () => {
    const data = [
      {
        lighthouseResult: {
          audits: {
            "screenshot-thumbnails": {
              details: {
                type: "table",
                items: [],
              },
            },
          },
        },
      },
    ];
    render(
      <TestWrapper data={data} labels={["Mobile"]}>
        <RenderFilmStrip />
      </TestWrapper>,
    );
    expect(screen.queryByText("Screenshots")).toBeNull();
  });

  it("renders Screenshots accordion when filmstrip data exists", () => {
    const data = [
      {
        lighthouseResult: {
          audits: {
            "screenshot-thumbnails": {
              details: {
                type: "filmstrip",
                items: [
                  {
                    data: "data:image/png;base64,a",
                    timestamp: 0,
                    timing: 100,
                  },
                ],
              },
            },
          },
        },
      },
    ];
    render(
      <TestWrapper data={data} labels={["Mobile"]}>
        <RenderFilmStrip />
      </TestWrapper>,
    );
    expect(screen.getByRole("button", { name: "Screenshots" })).toBeInTheDocument();
  });

  function filmstripReport(frames: Array<{ data: string; timing: number }>, extraAudits = {}) {
    return {
      lighthouseResult: {
        audits: {
          "screenshot-thumbnails": {
            details: {
              type: "filmstrip",
              items: frames.map((frame) => ({ ...frame, timestamp: frame.timing })),
            },
          },
          ...extraAudits,
        },
      },
    };
  }

  it("shows one image and timing per frame once the accordion is opened", () => {
    const data = [
      filmstripReport(
        [
          { data: "data:image/png;base64,a", timing: 100 },
          { data: "data:image/png;base64,b", timing: 500 },
          { data: "data:image/png;base64,c", timing: 1200 },
        ],
        { "first-contentful-paint": { numericValue: 450 } },
      ),
    ];
    render(
      <TestWrapper data={data} labels={["Mobile"]}>
        <RenderFilmStrip />
      </TestWrapper>,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Screenshots" }));

    expect(screen.getByTestId("report-heading")).toHaveTextContent("Mobile");
    const images = screen.getAllByRole("img");
    expect(images.map((image) => image.getAttribute("alt"))).toEqual([
      "timeline image at 100",
      "timeline image at 500",
      "timeline image at 1200",
    ]);
    expect(images.map((image) => image.getAttribute("src"))).toEqual([
      "data:image/png;base64,a",
      "data:image/png;base64,b",
      "data:image/png;base64,c",
    ]);
    expect(screen.getByText("100 ms")).toBeInTheDocument();
    expect(screen.getByText("500 ms")).toBeInTheDocument();
    expect(screen.getByText("1200 ms")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open full-screen view at 500 ms" }),
    ).toBeInTheDocument();
    // The FCP marker (450 ms) lands on the first frame at or after it.
    expect(screen.getByRole("button", { name: /at 500 ms/ })).toHaveTextContent("FCP");
  });

  it("renders one timeline per report", () => {
    const data = [
      filmstripReport([{ data: "data:image/png;base64,a", timing: 100 }]),
      filmstripReport([{ data: "data:image/png;base64,z", timing: 300 }]),
    ];
    render(
      <TestWrapper data={data} labels={["Mobile", "Desktop"]}>
        <RenderFilmStrip />
      </TestWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Screenshots" }));

    expect(screen.getAllByTestId("report-heading").map((h) => h.textContent)).toEqual([
      "Mobile",
      "Desktop",
    ]);
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("renders nothing when the filmstrip audit has no frames", () => {
    const data = [filmstripReport([])];
    const { container } = render(
      <TestWrapper data={data} labels={["Mobile"]}>
        <RenderFilmStrip />
      </TestWrapper>,
    );

    expect(screen.queryByRole("button", { name: "Screenshots" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container).toHaveTextContent("");
  });
});
