import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TreeView, type TreeDataItem } from "@/components/ui/tree-view";

const tree: TreeDataItem[] = [
  {
    id: "root",
    name: "https://solid-books.vercel.app/",
    metrics: [
      { label: "Transfer", value: "8.75 KB" },
      { label: "Time", value: "205 ms" },
    ],
    children: [
      {
        id: "font",
        name: "https://fonts.googleapis.com/css2?family=Geist&display=swap",
        metrics: [{ label: "Transfer", value: "1.51 KB" }],
        highlight: true,
      },
      {
        id: "script",
        name: "https://solid-books.vercel.app/assets/index-abc123.js",
        metrics: [{ label: "Time", value: "40 ms" }],
      },
    ],
  },
];

describe("TreeView", () => {
  it("splits a resource url into a filename and host, and shows metrics beside it", () => {
    render(<TreeView data={tree} expandAll />);

    expect(screen.getByText("solid-books.vercel.app")).toBeTruthy();
    expect(screen.getByText("index-abc123.js")).toBeTruthy();
    expect(screen.getByText("solid-books.vercel.app/assets/")).toBeTruthy();
    expect(screen.getByText("8.75 KB")).toBeTruthy();
    expect(screen.getByText("205 ms")).toBeTruthy();
    expect(screen.getByText("Longest chain")).toBeTruthy();
    expect(screen.getByRole("tree").querySelectorAll('[role="treeitem"]').length).toBe(3);
  });

  it("still reads pipe-separated labels from older tree data", () => {
    render(
      <TreeView
        data={[
          {
            id: "legacy",
            name: "https://example.com/app.js | Transfer: 2 KB | Time: 10 ms | (Longest Chain)",
          },
        ]}
      />,
    );

    expect(screen.getByText("/app.js")).toBeTruthy();
    expect(screen.getByText("2 KB")).toBeTruthy();
    expect(screen.getByText("10 ms")).toBeTruthy();
    expect(screen.getByText("Longest chain")).toBeTruthy();
    expect(screen.queryByText(/Transfer:/)).toBeNull();
  });
});
