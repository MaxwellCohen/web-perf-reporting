import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useScriptTreemapItems } from "@/features/page-speed-insights/script-treemap/useScriptTreemapItems";

vi.mock("@/features/page-speed-insights/PageSpeedContext", () => ({
  usePageSpeedItems: vi.fn(() => []),
}));

import { usePageSpeedItems } from "@/features/page-speed-insights/PageSpeedContext";

function HookProbe({ onResult }: { onResult: (value: ReturnType<typeof useScriptTreemapItems>) => void }) {
  onResult(useScriptTreemapItems());
  return null;
}

describe("useScriptTreemapItems", () => {
  it("returns empty when no page speed items", () => {
    vi.mocked(usePageSpeedItems).mockReturnValue([]);
    let result: ReturnType<typeof useScriptTreemapItems> = [{ label: "x", treeData: { type: "treemap-data", nodes: [] } }];
    render(<HookProbe onResult={(value) => { result = value; }} />);
    expect(result).toEqual([]);
  });

  it("excludes audits without treemap nodes", () => {
    vi.mocked(usePageSpeedItems).mockReturnValue([
      {
        label: "Mobile",
        item: {
          lighthouseResult: {
            audits: {
              "script-treemap-data": {
                details: { type: "treemap-data", nodes: [] },
              },
            },
          },
        },
      },
      {
        label: "Desktop",
        item: {
          lighthouseResult: {
            audits: {
              "script-treemap-data": {
                details: {
                  type: "treemap-data",
                  nodes: [{ name: "a.js", resourceBytes: 1 }],
                },
              },
            },
          },
        },
      },
    ] as never);

    let result: ReturnType<typeof useScriptTreemapItems> = [];
    render(<HookProbe onResult={(value) => { result = value; }} />);
    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("Desktop");
  });
});
