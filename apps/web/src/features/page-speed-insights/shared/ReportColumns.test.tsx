import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportColumn, ReportColumns } from "./ReportColumns";

describe("ReportColumns", () => {
  it("puts two reports side by side on a wide screen and stacks them on a phone", () => {
    render(
      <ReportColumns testId="columns">
        <ReportColumn label="Mobile">m</ReportColumn>
        <ReportColumn label="Desktop" meta="3 items">
          d
        </ReportColumn>
      </ReportColumns>,
    );

    const columns = screen.getByTestId("columns");
    expect(columns).toHaveClass("grid-cols-1", "lg:grid-cols-2");
    expect(screen.getAllByTestId("report-heading").map((h) => h.textContent)).toEqual([
      "Mobile",
      "Desktop3 items",
    ]);
    expect(screen.getByRole("region", { name: "Desktop" })).toHaveTextContent("d");
  });

  it("gives a single report the full width with no heading", () => {
    render(
      <ReportColumns testId="columns">
        <ReportColumn label="Mobile" showLabel={false}>
          m
        </ReportColumn>
      </ReportColumns>,
    );

    expect(screen.getByTestId("columns")).not.toHaveClass("lg:grid-cols-2");
    expect(screen.queryByTestId("report-heading")).not.toBeInTheDocument();
  });

  it("uses count when some children render nothing", () => {
    render(
      <ReportColumns testId="columns" count={1}>
        <ReportColumn label="Mobile">m</ReportColumn>
        {null}
      </ReportColumns>,
    );

    expect(screen.getByTestId("columns")).not.toHaveClass("lg:grid-cols-2");
  });
});
