import { describe, expect, it } from "vitest";
import { createColumnFromHeading } from "@/features/page-speed-insights/shared/tableColumnUtils";

describe("tableColumnUtils", () => {
  it("builds a table column definition from the heading metadata", () => {
    const heading = {
      key: "transferSize",
      label: "Transfer Size",
      valueType: "bytes",
    } as any;

    expect(createColumnFromHeading(heading)).toEqual({
      id: "transferSize",
      accessorKey: "transferSize",
      header: "Transfer Size",
      size: 120,
      minSize: 50,
      maxSize: 800,
      enableResizing: true,
      filterFn: "inNumberRange",
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        heading: {
          heading,
        },
      },
    });
  });

  it("falls back to the key when the heading label is not a string", () => {
    const heading = {
      key: "custom",
      label: { formattedDefault: "Custom" },
      valueType: "text",
    } as any;

    expect(createColumnFromHeading(heading).header).toBe("custom");
  });
});
