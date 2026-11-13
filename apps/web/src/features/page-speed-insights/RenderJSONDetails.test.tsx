import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RenderJSONDetails } from "@/features/page-speed-insights/RenderJSONDetails";

describe("RenderJSONDetails", () => {
  it("renders details with default title", () => {
    render(<RenderJSONDetails data={{ foo: "bar" }} />);
    expect(screen.getByText("All Data")).toBeInTheDocument();
  });

  it("renders details with custom title", () => {
    render(<RenderJSONDetails data={{}} title="Custom Title" />);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.queryByText("All Data")).not.toBeInTheDocument();
  });

  it("renders JSON stringified data when data is provided", () => {
    const data = { key: "value", count: 42 };
    const { container } = render(<RenderJSONDetails data={data} />);
    expect(container.querySelector("pre")?.textContent).toBe(JSON.stringify(data, null, 2));
  });

  it("renders data2 when provided", () => {
    const { container } = render(<RenderJSONDetails data={{ a: 1 }} data2={{ b: 2 }} />);
    const blocks = container.querySelectorAll("pre");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.textContent).toBe(JSON.stringify({ a: 1 }, null, 2));
    expect(blocks[1]?.textContent).toBe(JSON.stringify({ b: 2 }, null, 2));
  });

  it("renders only data2 when data is undefined", () => {
    const { container } = render(<RenderJSONDetails data2={{ x: 1 }} />);
    const blocks = container.querySelectorAll("pre");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.textContent).toBe(JSON.stringify({ x: 1 }, null, 2));
  });

  it("renders only data when data2 is undefined", () => {
    const { container } = render(<RenderJSONDetails data={{ x: 1 }} />);
    expect(container.querySelectorAll("pre")).toHaveLength(1);
  });

  it("can be expanded to show content", () => {
    const { container } = render(<RenderJSONDetails data={{ nested: { value: 1 } }} />);
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("All Data"));
    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(container.querySelector("pre")).toHaveTextContent('"nested"');
  });

  it("passes through additional props to details element", () => {
    render(<RenderJSONDetails data={{}} data-testid="json-details" open />);
    expect(screen.getByTestId("json-details")).toHaveAttribute("open");
  });
});
