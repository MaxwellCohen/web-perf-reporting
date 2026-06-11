import * as React from "react";
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PageSpeedInsightsStoreProvider,
  selectPageSpeedIsLoading,
  useFullPageScreenshots,
  usePageSpeedInsightsStore,
  usePageSpeedItems,
  usePageSpeedReportTitle,
  usePageSpeedSelector,
  useRequiredPageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";

vi.mock("@xstate/store-react", () => {
  function createStore(config: {
    context: unknown;
    on: Record<string, (ctx: unknown, event?: unknown) => unknown>;
  }) {
    let state = config.context;
    const listeners = new Set<() => void>();
    const trigger = Object.fromEntries(
      Object.entries(config.on).map(([eventType, handler]) => [
        eventType,
        (event?: unknown) => {
          state = handler(state, event);
          listeners.forEach((l) => l());
        },
      ]),
    );

    return {
      get: () => ({ context: state }),
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      trigger,
    };
  }
  return {
    useStore: (definition: Parameters<typeof createStore>[0]) => {
      const storeRef = React.useRef<ReturnType<typeof createStore> | undefined>(undefined);
      if (!storeRef.current) {
        storeRef.current = createStore(definition);
      }
      return storeRef.current;
    },
    useSelector: (
      store: ReturnType<typeof createStore>,
      selector: (snapshot: { context: unknown }) => unknown,
    ) =>
      React.useSyncExternalStore(
        (listener) => store.subscribe(listener),
        () => selector(store.get()),
        () => selector(store.get()),
      ),
  };
});

type ProviderProps = {
  data?: any[];
  labels: string[];
  isLoading: boolean;
  children: ReactNode;
};

function createLighthouseResult(overrides: Record<string, unknown> = {}) {
  return {
    lighthouseVersion: "12.8.2",
    finalDisplayedUrl: "https://example.com",
    configSettings: {
      formFactor: "mobile",
    },
    fullPageScreenshot: {
      nodes: {},
      screenshot: {
        data: "image-data",
        height: 200,
        width: 100,
      },
    },
    ...overrides,
  };
}

function TestProvider({ data, labels, isLoading, children }: ProviderProps) {
  const store = usePageSpeedInsightsStore({
    data,
    labels,
    isLoading,
  });

  return <PageSpeedInsightsStoreProvider store={store}>{children}</PageSpeedInsightsStoreProvider>;
}

function StoreConsumer() {
  const items = usePageSpeedItems();
  const reportTitle = usePageSpeedReportTitle();
  const fullPageScreenshots = useFullPageScreenshots();
  const isLoading = usePageSpeedSelector(selectPageSpeedIsLoading);

  return (
    <>
      <div data-testid="item-count">{items.length}</div>
      <div data-testid="report-title">{reportTitle}</div>
      <div data-testid="screenshot-labels">{Object.keys(fullPageScreenshots).join(",")}</div>
      <div data-testid="loading-state">{String(isLoading)}</div>
    </>
  );
}

function OutsideProviderConsumer() {
  usePageSpeedItems();
  return null;
}

describe("PageSpeedContext", () => {
  it("provides derived dashboard state to consumers", () => {
    const { container } = render(
      <TestProvider
        data={[
          {
            lighthouseResult: createLighthouseResult(),
            analysisUTCTimestamp: "2024-02-03T12:00:00.000Z",
          },
        ]}
        labels={["Mobile run"]}
        isLoading={false}
      >
        <StoreConsumer />
      </TestProvider>,
    );

    expect(container.querySelector('[data-testid="item-count"]')).toHaveTextContent("1");
    expect(container.querySelector('[data-testid="report-title"]')).toHaveTextContent(
      `Report for https://example.com on Mobile at ${new Date(
        "2024-02-03T12:00:00.000Z",
      ).toLocaleDateString()}`,
    );
    expect(container.querySelector('[data-testid="screenshot-labels"]')).toHaveTextContent(
      "Mobile run",
    );
    expect(container.querySelector('[data-testid="loading-state"]')).toHaveTextContent("false");
  });

  it("updates consumers when provider input changes", () => {
    const { container, rerender } = render(
      <TestProvider
        data={[
          {
            lighthouseResult: createLighthouseResult(),
            analysisUTCTimestamp: "2024-02-03T12:00:00.000Z",
          },
        ]}
        labels={["Mobile run"]}
        isLoading={true}
      >
        <StoreConsumer />
      </TestProvider>,
    );

    rerender(
      <TestProvider
        data={[
          {
            lighthouseResult: createLighthouseResult({
              finalDisplayedUrl: "https://example.org",
              configSettings: {
                formFactor: "desktop",
              },
              fullPageScreenshot: null,
            }),
            analysisUTCTimestamp: "2024-02-04T12:00:00.000Z",
          },
        ]}
        labels={["Desktop run"]}
        isLoading={false}
      >
        <StoreConsumer />
      </TestProvider>,
    );

    expect(container.querySelector('[data-testid="item-count"]')).toHaveTextContent("1");
    expect(container.querySelector('[data-testid="report-title"]')).toHaveTextContent(
      `Report for https://example.org on Desktop at ${new Date(
        "2024-02-04T12:00:00.000Z",
      ).toLocaleDateString()}`,
    );
    expect(container.querySelector('[data-testid="screenshot-labels"]')).toHaveTextContent(
      "Desktop run",
    );
    expect(container.querySelector('[data-testid="loading-state"]')).toHaveTextContent("false");
  });

  it("throws when selectors are used outside the provider", () => {
    expect(() => render(<OutsideProviderConsumer />)).toThrow(
      "PageSpeed insights store is unavailable outside the dashboard provider.",
    );
  });

  it("filters store items when user label filter changes", () => {
    const data = [
      {
        lighthouseResult: createLighthouseResult({
          finalDisplayedUrl: "https://mobile.example.com",
        }),
        analysisUTCTimestamp: "2024-02-03T12:00:00.000Z",
      },
      {
        lighthouseResult: createLighthouseResult({
          finalDisplayedUrl: "https://desktop.example.com",
          configSettings: { formFactor: "desktop" },
        }),
        analysisUTCTimestamp: "2024-02-04T12:00:00.000Z",
      },
    ];

    function FilterConsumer() {
      const store = useRequiredPageSpeedInsightsStore();
      const items = usePageSpeedItems();
      const reportTitle = usePageSpeedReportTitle();

      return (
        <>
          <div data-testid="item-labels">{items.map((item) => item.label).join(",")}</div>
          <div data-testid="filtered-report-title">{reportTitle}</div>
          <button type="button" onClick={() => store.trigger.setUserLabelFilter({ labels: ["Mobile"] })}>
            Filter mobile
          </button>
        </>
      );
    }

    const { container, getByRole } = render(
      <TestProvider data={data} labels={["Mobile", "Desktop"]} isLoading={false}>
        <FilterConsumer />
      </TestProvider>,
    );

    const mobileDate = new Date("2024-02-03T12:00:00.000Z").toLocaleDateString();
    const desktopDate = new Date("2024-02-04T12:00:00.000Z").toLocaleDateString();

    expect(container.querySelector('[data-testid="item-labels"]')).toHaveTextContent("Mobile,Desktop");
    expect(container.querySelector('[data-testid="filtered-report-title"]')).toHaveTextContent(
      `Report for https://mobile.example.com on Mobile at ${mobileDate}, https://desktop.example.com on Desktop at ${desktopDate}`,
    );

    getByRole("button", { name: "Filter mobile" }).click();

    expect(container.querySelector('[data-testid="item-labels"]')).toHaveTextContent("Mobile");
    expect(container.querySelector('[data-testid="filtered-report-title"]')).toHaveTextContent(
      `Report for https://mobile.example.com on Mobile at ${mobileDate}`,
    );
  });
});
