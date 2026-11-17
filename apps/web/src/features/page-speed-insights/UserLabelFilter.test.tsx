import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  PageSpeedInsightsProvider,
  usePageSpeedItems,
  usePageSpeedUserLabelFilterActions,
} from "@/features/page-speed-insights/PageSpeedContext";
import { UserLabelFilter } from "@/features/page-speed-insights/UserLabelFilter";
import type { NullablePageSpeedInsights } from "@/lib/schema";

function report(url: string, formFactor: string) {
  return {
    lighthouseResult: {
      finalDisplayedUrl: url,
      configSettings: { formFactor },
    },
    analysisUTCTimestamp: "2024-02-03T12:00:00.000Z",
  };
}

const DATA = [
  report("https://example.com", "mobile"),
  report("https://example.com", "desktop"),
] as unknown as NullablePageSpeedInsights[];
const LABELS = ["Mobile", "Desktop"];

function ItemsProbe() {
  const items = usePageSpeedItems();
  const { resetUserLabelFilter } = usePageSpeedUserLabelFilterActions();
  return (
    <>
      <div data-testid="items">{items.map((item) => item.label).join(",")}</div>
      <button type="button" onClick={resetUserLabelFilter}>
        Reset probe
      </button>
    </>
  );
}

function renderFilter(data = DATA, labels = LABELS) {
  return render(
    <PageSpeedInsightsProvider data={data} labels={labels}>
      <UserLabelFilter />
      <ItemsProbe />
    </PageSpeedInsightsProvider>,
  );
}

function openMenu() {
  const trigger = screen.getByRole("button", { expanded: false });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
}

function visibleLabels() {
  return screen.getByTestId("items").textContent;
}

function urlLabels() {
  return new URLSearchParams(window.location.search).getAll("labels");
}

describe("UserLabelFilter", () => {
  // The filter writes its selection to the query string.
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("renders nothing when there is only one label", () => {
    renderFilter([DATA[0]], ["Mobile"]);

    expect(screen.queryByRole("button", { expanded: false })).not.toBeInTheDocument();
    expect(visibleLabels()).toBe("Mobile");
  });

  it("offers every label, all checked at first", () => {
    renderFilter();
    openMenu();

    const options = screen.getAllByRole("menuitemcheckbox");
    expect(options.map((option) => option.textContent).sort()).toEqual(["Desktop", "Mobile"]);
    for (const option of options) expect(option).toHaveAttribute("aria-checked", "true");
    expect(visibleLabels()?.split(",").sort()).toEqual(["Desktop", "Mobile"]);
    expect(urlLabels()).toEqual([]);
  });

  it("narrows the reports to the remaining label and writes it to the URL", () => {
    renderFilter();
    openMenu();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Desktop" }));

    expect(visibleLabels()).toBe("Mobile");
    expect(urlLabels()).toEqual(["Mobile"]);
  });

  it("restores both labels and removes the URL parameter when re-checked", () => {
    renderFilter();
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Desktop" }));
    expect(visibleLabels()).toBe("Mobile");

    openMenu();
    expect(screen.getByRole("menuitemcheckbox", { name: "Desktop" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Desktop" }));

    expect(visibleLabels()?.split(",").sort()).toEqual(["Desktop", "Mobile"]);
    expect(urlLabels()).toEqual([]);
  });

  it("selects everything again when the last remaining label is unchecked", () => {
    renderFilter();
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Desktop" }));
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Mobile" }));

    expect(visibleLabels()?.split(",").sort()).toEqual(["Desktop", "Mobile"]);
    expect(urlLabels()).toEqual([]);
  });

  it("shows every label checked again after the filter is reset", () => {
    renderFilter();
    openMenu();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Mobile" }));
    expect(visibleLabels()).toBe("Desktop");

    fireEvent.click(screen.getByRole("button", { name: "Reset probe" }));

    expect(visibleLabels()?.split(",").sort()).toEqual(["Desktop", "Mobile"]);
  });
});
