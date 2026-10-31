import { describe, expect, it } from "vitest";

import { scriptCpuLabel } from "@/features/page-speed-insights/shared/scriptResourceFacts";

describe("scriptCpuLabel", () => {
  it("joins lines with a middle dot", () => {
    expect(scriptCpuLabel({ totalMs: 420, scriptingMs: 300, parseMs: 80 })).toBe(
      "Total CPU Time 420 ms · Script Parse 80 ms · Script Evaluation 300 ms · Other 40 ms",
    );
  });
});
