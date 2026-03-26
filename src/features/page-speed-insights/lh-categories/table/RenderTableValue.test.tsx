import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ItemValue } from "@/lib/schema";
import {
  formatBytes,
  RenderBytesValue,
  RenderCountNumber,
  RenderMSValue,
  RenderTableValue,
  renderTimeValue,
} from "@/features/page-speed-insights/lh-categories/table/RenderTableValue";

vi.mock("@/features/page-speed-insights/lh-categories/table/RenderNode", () => ({
  NodeComponent: ({ item }: { item: { nodeLabel?: string } }) => (
    <div data-testid="node-component">{item?.nodeLabel ?? "node"}</div>
  ),
}));

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 bytes");
  });

  it("formats KB", () => {
    expect(formatBytes(2048)).toBe("2.00 KB");
  });

  it("formats MB", () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.00 MB");
  });
});

describe("renderTimeValue", () => {
  it("returns 0 ms for zero", () => {
    expect(renderTimeValue(0)).toBe("0 ms");
  });

  it("formats milliseconds", () => {
    expect(renderTimeValue(500)).toBe("500 ms");
  });

  it("formats seconds", () => {
    expect(renderTimeValue(1500)).toBe("1.500 s");
  });

  it("formats minutes", () => {
    expect(renderTimeValue(125000)).toBe("2 m 5.0 s");
  });
});

describe("RenderCountNumber", () => {
  it("renders number", () => {
    expect(RenderCountNumber(42)).toBe("42");
  });

  it("returns N/A for NaN", () => {
    expect(RenderCountNumber(NaN)).toBe("N/A");
  });
});

describe("RenderBytesValue", () => {
  it("renders bytes value", () => {
    const { container } = render(<RenderBytesValue value={2048} />);
    expect(container.textContent).toContain("2.00 KB");
  });
});

describe("RenderMSValue", () => {
  it("renders ms value", () => {
    const { container } = render(<RenderMSValue value={100} />);
    expect(container.textContent).toContain("100 ms");
  });
});

describe("RenderTableValue", () => {
  it("returns null for undefined", () => {
    const { container } = render(<RenderTableValue value={undefined} device="" />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null for null", () => {
    const { container } = render(
      <RenderTableValue value={null as unknown as ItemValue} device="" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders bytes with heading valueType", () => {
    const { container } = render(
      <RenderTableValue
        value={2048}
        heading={{ key: "size", label: "Size", valueType: "bytes" }}
        device=""
      />,
    );
    expect(container.textContent).toContain("2.00 KB");
  });

  it("renders text with heading valueType", () => {
    const { container } = render(
      <RenderTableValue
        value="hello"
        heading={{ key: "text", label: "Text", valueType: "text" }}
        device=""
      />,
    );
    expect(container.textContent).toContain("hello");
  });

  it("renders code with heading valueType", () => {
    const { container } = render(
      <RenderTableValue
        value="const x = 1"
        heading={{ key: "code", label: "Code", valueType: "code" }}
        device=""
      />,
    );
    expect(container.querySelector("code")).toBeTruthy();
    expect(container.textContent).toContain("const x = 1");
  });

  it("renders link value type", () => {
    const { container } = render(
      <RenderTableValue
        value={{ type: "link", url: "https://example.com", text: "Example" }}
        device=""
      />,
    );
    const link = container.querySelector("a");
    expect(link?.href).toContain("example.com");
    expect(link?.textContent).toBe("Example");
  });

  it("renders url value type", () => {
    const { container } = render(
      <RenderTableValue value={{ type: "url", value: "https://test.com" }} device="" />,
    );
    const link = container.querySelector("a");
    expect(link?.href).toContain("test.com");
  });

  it("renders numeric value type", () => {
    const { container } = render(
      <RenderTableValue value={{ type: "numeric", value: 42.5 }} device="" />,
    );
    expect(container.textContent).toContain("42.5");
  });

  it("renders node value type", () => {
    const { container } = render(
      <RenderTableValue
        value={{ type: "node", lhId: "1", nodeLabel: "Test Node" }}
        device="Mobile"
      />,
    );
    expect(container.querySelector('[data-testid="node-component"]')).toBeTruthy();
  });

  it("renders default for unknown value", () => {
    const { container } = render(
      <RenderTableValue value={{ foo: "bar" } as unknown as ItemValue} device="" />,
    );
    expect(container.querySelector("pre")).toBeTruthy();
    expect(container.textContent).toContain("foo");
  });
});
