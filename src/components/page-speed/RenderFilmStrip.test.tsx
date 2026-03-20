import React from 'react';

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@xstate/store-react', () => {
  function createStore(config: {
    context: unknown;
    on: { sync: (ctx: unknown, event: unknown) => unknown };
  }) {
    let state = config.context;
    const listeners = new Set<() => void>();
    return {
      get: () => ({ context: state }),
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      trigger: {
        sync: (event: unknown) => {
          state = config.on.sync(state, event);
          listeners.forEach((l) => l());
        },
      },
    };
  }
  return {
    useStore: (definition: Parameters<typeof createStore>[0]) => {
      const storeRef = React.useRef<ReturnType<typeof createStore> | undefined>(
        undefined,
      );
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

import { Accordion } from '@/components/ui/accordion';
import {
  PageSpeedInsightsStoreProvider,
  usePageSpeedInsightsStore,
} from '@/components/page-speed/PageSpeedContext';
import { RenderFilmStrip } from '@/components/page-speed/RenderFilmStrip';

vi.mock('@/components/ui/accordion', () => {
  const ItemValueContext = React.createContext<string>('');
  const AccordionContext = React.createContext<{ value: string[]; onValueChange: (v: string[]) => void; type: string }>({ value: [], onValueChange: () => {}, type: 'single' });
  const AccordionRoot = ({ children, type = 'single', defaultValue }: { children?: React.ReactNode; type?: string; defaultValue?: string | string[] }) => {
    const [val, setVal] = React.useState<string[]>(() => (Array.isArray(defaultValue) ? defaultValue : defaultValue ? [defaultValue] : []));
    return (
      <AccordionContext.Provider value={{ value: val, onValueChange: setVal, type }}>
        <div>{children}</div>
      </AccordionContext.Provider>
    );
  };
  const AccordionItem = ({ children, value: v }: { children?: React.ReactNode; value: string }) => (
    <ItemValueContext.Provider value={v}><div>{children}</div></ItemValueContext.Provider>
  );
  const AccordionTrigger = ({ children }: { children?: React.ReactNode }) => {
    const ctx = React.useContext(AccordionContext);
    const v = React.useContext(ItemValueContext);
    return (
      <button type="button" onClick={() => ctx.onValueChange(ctx.value.includes(v) ? [] : [v])}>{children}</button>
    );
  };
  const AccordionContent = ({ children }: { children?: React.ReactNode }) => {
    const ctx = React.useContext(AccordionContext);
    const v = React.useContext(ItemValueContext);
    return ctx.value.includes(v) ? <div>{children}</div> : null;
  };
  return { Accordion: AccordionRoot, AccordionItem, AccordionTrigger, AccordionContent };
});

vi.mock('@/components/page-speed/Timeline', () => ({
  Timeline: ({ device }: { device?: string }) => <div data-timeline>{device ?? 'Timeline'}</div>,
}));

function TestWrapper({
  children,
  data,
  labels,
}: {
  children: React.ReactNode;
  data: any[];
  labels: string[];
}) {
  const store = usePageSpeedInsightsStore({ data, labels, isLoading: false });
  return (
    <PageSpeedInsightsStoreProvider store={store}>
      <Accordion type="single" collapsible>
        {children}
      </Accordion>
    </PageSpeedInsightsStoreProvider>
  );
}

describe('RenderFilmStrip', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns null when no screenshot thumbnails in items', () => {
    const data = [
      {
        lighthouseResult: {
          audits: {},
        },
      },
    ];
    render(
      <TestWrapper data={data} labels={['Mobile']}>
        <RenderFilmStrip />
      </TestWrapper>,
    );
    expect(screen.queryByText('Screenshots')).toBeNull();
  });

  it('returns null when screenshot-thumbnails details is not filmstrip type', () => {
    const data = [
      {
        lighthouseResult: {
          audits: {
            'screenshot-thumbnails': {
              details: {
                type: 'table',
                items: [],
              },
            },
          },
        },
      },
    ];
    render(
      <TestWrapper data={data} labels={['Mobile']}>
        <RenderFilmStrip />
      </TestWrapper>,
    );
    expect(screen.queryByText('Screenshots')).toBeNull();
  });

  it('renders Screenshots accordion when filmstrip data exists', () => {
    const data = [
      {
        lighthouseResult: {
          audits: {
            'screenshot-thumbnails': {
              details: {
                type: 'filmstrip',
                items: [
                  {
                    data: 'data:image/png;base64,a',
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
    const { container } = render(
      <TestWrapper data={data} labels={['Mobile']}>
        <RenderFilmStrip />
      </TestWrapper>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
