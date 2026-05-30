import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";

describe("RenderJSONDetails", () => {
  it("renders details with default title", () => {
    const { container } = render(<RenderJSONDetails data={{ foo: "bar" }} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders details with custom title", () => {
    const { container } = render(<RenderJSONDetails data={{}} title="Custom Title" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders JSON stringified data when data is provided", () => {
    const data = { key: "value", count: 42 };
    const { container } = render(<RenderJSONDetails data={data} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders data2 when provided", () => {
    const data = { a: 1 };
    const data2 = { b: 2 };
    const { container } = render(<RenderJSONDetails data={data} data2={data2} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders only data2 when data is undefined", () => {
    const { container } = render(<RenderJSONDetails data2={{ x: 1 }} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders only data when data2 is undefined", () => {
    const { container } = render(<RenderJSONDetails data={{ x: 1 }} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("can be expanded to show content", () => {
    const { container } = render(<RenderJSONDetails data={{ nested: { value: 1 } }} />);
    const summary = screen.getByText("All Data");
    fireEvent.click(summary);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("passes through additional props to details element", () => {
    const { container } = render(<RenderJSONDetails data={{}} data-testid="json-details" open />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
