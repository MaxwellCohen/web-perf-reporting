import { describe, expect, it, vi } from "vitest";
import {
  buildTreemapChartNodes,
  copyTreemapNodeName,
  getTreemapDisplayLabel,
  getTreemapLabel,
  getTreemapNodeColor,
} from "@/features/page-speed-insights/script-treemap/treemapChartData";

describe("getTreemapNodeColor", () => {
  it("returns gray when unused bytes are not reported", () => {
    expect(getTreemapNodeColor(1000)).toBe("hsl(220 9% 46%)");
  });

  it("returns green for low unused percentage", () => {
    expect(getTreemapNodeColor(1000, 100)).toBe("hsl(142 71% 45%)");
  });

  it("returns yellow for moderate unused percentage", () => {
    expect(getTreemapNodeColor(1000, 300)).toBe("hsl(45 93% 47%)");
  });

  it("returns red for high unused percentage", () => {
    expect(getTreemapNodeColor(1000, 950)).toBe("hsl(0 84% 60%)");
  });
});

describe("getTreemapDisplayLabel", () => {
  it("returns short inline names unchanged", () => {
    expect(getTreemapDisplayLabel("(inline) foo")).toEqual({ primary: "(inline) foo" });
  });

  it("prioritizes path segments for URLs", () => {
    expect(
      getTreemapDisplayLabel("https://www.example.com/static/chunks/app-page.js", 40),
    ).toEqual({
      primary: "/chunks/app-page.js",
      secondary: "www.example.com",
    });
  });

  it("preserves the filename when truncating long paths", () => {
    const label = getTreemapDisplayLabel(
      "https://www.example.com/very/long/path/to/a/script/file.js",
      24,
    );

    expect(label.primary.endsWith("file.js")).toBe(true);
    expect(label.primary.includes("/")).toBe(true);
    expect(label.secondary).toBe("www.example.com");
  });
});

describe("getTreemapLabel", () => {
  it("returns short names unchanged", () => {
    expect(getTreemapLabel("(inline) foo")).toBe("(inline) foo");
  });

  it("returns path-first label for URLs", () => {
    const label = getTreemapLabel(
      "https://www.example.com/very/long/path/to/a/script/file.js",
      40,
    );
    expect(label.startsWith("/")).toBe(true);
    expect(label.includes("file.js")).toBe(true);
  });

  it("truncates long non-url strings", () => {
    const label = getTreemapLabel("abcdefghijklmnopqrstuvwxyz", 10);
    expect(label).toBe("…rstuvwxyz");
  });
});

describe("buildTreemapChartNodes", () => {
  it("maps resource bytes to size and preserves hierarchy", () => {
    const nodes = buildTreemapChartNodes([
      {
        name: "https://example.com",
        resourceBytes: 1000,
        children: [
          {
            name: "script.js",
            resourceBytes: 400,
            unusedBytes: 200,
          },
        ],
      },
    ]);

    expect(nodes).toEqual([
      {
        id: "treemap-0",
        name: "treemap-0",
        fullName: "https://example.com",
        size: 1000,
        resourceBytes: 1000,
        unusedBytes: undefined,
        children: [
          {
            id: "treemap-0-0",
            name: "treemap-0-0",
            fullName: "script.js",
            size: 400,
            resourceBytes: 400,
            unusedBytes: 200,
            children: undefined,
          },
        ],
      },
    ]);
  });

  it("assigns unique names for duplicate script labels", () => {
    const nodes = buildTreemapChartNodes([
      {
        name: "https://example.com",
        resourceBytes: 1000,
        children: [
          {
            name: "(inline) self.__next_f.p…",
            resourceBytes: 100,
          },
          {
            name: "(inline) self.__next_f.p…",
            resourceBytes: 200,
          },
        ],
      },
    ]);

    const childNames = nodes[0]?.children?.map((child) => child.name) ?? [];
    expect(new Set(childNames).size).toBe(childNames.length);
    expect(nodes[0]?.children?.map((child) => child.fullName)).toEqual([
      "(inline) self.__next_f.p…",
      "(inline) self.__next_f.p…",
    ]);
  });
});

describe("copyTreemapNodeName", () => {
  it("returns false for empty names", async () => {
    await expect(copyTreemapNodeName("")).resolves.toBe(false);
  });

  it("writes the node name to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await expect(
      copyTreemapNodeName("https://example.com/script.js"),
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.com/script.js");
  });

  it("returns false when clipboard write fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });

    await expect(copyTreemapNodeName("https://example.com/script.js")).resolves.toBe(false);
  });
});
