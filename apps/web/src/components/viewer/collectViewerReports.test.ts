import { describe, expect, it } from "vitest";
import { collectViewerReports } from "@/components/viewer/collectViewerReports";

describe("collectViewerReports", () => {
  const lighthouseResult = { categories: {} };
  const json = JSON.stringify({ lighthouseResult });

  it("collects multiple pasted reports with labels", async () => {
    const result = await collectViewerReports(
      "text",
      [
        { name: "Mobile", content: json },
        { name: "Desktop", content: json },
      ],
      [],
    );

    expect(result.data).toHaveLength(2);
    expect(result.labels).toEqual(["Mobile", "Desktop"]);
  });

  it("collects multiple uploaded files with labels", async () => {
    const mobile = new File([json], "mobile.json", { type: "application/json" });
    const desktop = new File([json], "desktop.json", { type: "application/json" });

    const result = await collectViewerReports("file", [], [
      { name: "Mobile", file: mobile },
      { name: "Desktop", file: desktop },
    ]);

    expect(result.data).toHaveLength(2);
    expect(result.labels).toEqual(["Mobile", "Desktop"]);
  });

  it("throws when no files are uploaded", async () => {
    await expect(collectViewerReports("file", [], [])).rejects.toThrow(
      "Please upload at least one JSON file",
    );
  });

  it("throws when pasted JSON is invalid", async () => {
    await expect(
      collectViewerReports("text", [{ name: "Bad", content: "not json" }], []),
    ).rejects.toThrow();
  });
});
