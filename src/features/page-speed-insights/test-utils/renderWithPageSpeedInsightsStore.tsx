import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import {
  PageSpeedInsightsStoreProvider,
  usePageSpeedInsightsStore,
} from "@/features/page-speed-insights/PageSpeedContext";
import type { NullablePageSpeedInsights } from "@/lib/schema";

export type RenderPageSpeedStoreOptions = {
  data?: NullablePageSpeedInsights[];
  labels: string[];
  isLoading?: boolean;
};

function PageSpeedStoreRoot({
  children,
  data,
  labels,
  isLoading = false,
}: RenderPageSpeedStoreOptions & { children: ReactNode }) {
  const store = usePageSpeedInsightsStore({ data, labels, isLoading });
  return <PageSpeedInsightsStoreProvider store={store}>{children}</PageSpeedInsightsStoreProvider>;
}

export function renderWithPageSpeedInsightsStore(
  ui: ReactElement,
  options: RenderPageSpeedStoreOptions & Omit<RenderOptions, "wrapper">,
) {
  const { data, labels, isLoading, ...renderOptions } = options;
  return render(ui, {
    ...renderOptions,
    wrapper: ({ children }) => (
      <PageSpeedStoreRoot data={data} labels={labels} isLoading={isLoading}>
        {children}
      </PageSpeedStoreRoot>
    ),
  });
}
