import { describe, expect, it } from "vitest";
import { networkTreeToTreeData } from "@/features/page-speed-insights/shared/networkDependencyTree";

describe("networkTreeToTreeData", () => {
  it("keeps finish time and adds how much a child extends the chain", () => {
    const [root] = networkTreeToTreeData(
      {
        doc: {
          url: "https://www.example.com/",
          transferSize: 809,
          navStartToEndTime: 157,
          isLongest: true,
          children: {
            script: {
              url: "https://www.example.com/s.js",
              transferSize: 1556,
              navStartToEndTime: 166,
              isLongest: true,
              children: {
                chunk: {
                  url: "https://www.example.com/chunk.js",
                  navStartToEndTime: 200,
                },
              },
            },
          },
        },
      },
      true,
    );

    expect(root?.metrics).toEqual([
      { label: "Transfer", value: "809 bytes" },
      { label: "Time", value: "157 ms" },
    ]);
    expect(root?.children?.[0]?.metrics).toEqual([
      { label: "Transfer", value: "1.52 KB" },
      { label: "Extends", value: "9 ms" },
      { label: "Time", value: "166 ms" },
    ]);
    expect(root?.children?.[0]?.children?.[0]?.metrics).toEqual([
      { label: "Extends", value: "34 ms" },
      { label: "Time", value: "200 ms" },
    ]);
  });

  it("shows a zero extension when a child finishes no later than its parent", () => {
    const [root] = networkTreeToTreeData({
      doc: {
        url: "https://www.example.com/",
        navStartToEndTime: 157,
        children: {
          early: {
            url: "https://www.example.com/early.js",
            navStartToEndTime: 140,
          },
        },
      },
    });

    expect(root?.children?.[0]?.metrics).toEqual([
      { label: "Extends", value: "0 ms" },
      { label: "Time", value: "140 ms" },
    ]);
  });
});
