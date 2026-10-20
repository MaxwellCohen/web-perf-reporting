import { describe, expect, it } from "vitest";

import {
  isHighScriptCpuOther,
  scriptCpuLabel,
  scriptCpuLines,
  scriptCpuOtherMs,
} from "@/features/page-speed-insights/shared/scriptResourceFacts";

describe("scriptCpuOtherMs", () => {
  it("returns residual main-thread time after parse and evaluation", () => {
    expect(scriptCpuOtherMs({ totalMs: 420, scriptingMs: 300, parseMs: 80 })).toBe(40);
  });

  it("clamps floating-point underflow to zero", () => {
    expect(scriptCpuOtherMs({ totalMs: 100, scriptingMs: 60, parseMs: 40.0001 })).toBe(0);
  });
});

describe("isHighScriptCpuOther", () => {
  it("warns when other is at least 50ms and 25% of total", () => {
    expect(isHighScriptCpuOther({ totalMs: 200, scriptingMs: 50, parseMs: 50 })).toBe(true);
  });

  it("does not warn when other is long but a small share of total", () => {
    expect(isHighScriptCpuOther({ totalMs: 600, scriptingMs: 270, parseMs: 270 })).toBe(false);
  });

  it("does not warn when other is a large share but under 50ms", () => {
    expect(isHighScriptCpuOther({ totalMs: 200, scriptingMs: 80, parseMs: 80 })).toBe(false);
  });
});

describe("scriptCpuLines", () => {
  it("includes Other when residual time rounds above zero", () => {
    expect(scriptCpuLines({ totalMs: 420, scriptingMs: 300, parseMs: 80 })).toEqual([
      "Total CPU Time 420 ms",
      "Script Parse 80 ms",
      "Script Evaluation 300 ms",
      "Other 40 ms",
    ]);
  });

  it("marks Other high when it is long and a large share of total", () => {
    expect(scriptCpuLines({ totalMs: 200, scriptingMs: 50, parseMs: 50 })).toEqual([
      "Total CPU Time 200 ms",
      "Script Parse 50 ms",
      "Script Evaluation 50 ms",
      "Other 100 ms · high",
    ]);
  });

  it("omits Other when residual rounds to zero", () => {
    expect(scriptCpuLines({ totalMs: 380, scriptingMs: 300, parseMs: 80 })).toEqual([
      "Total CPU Time 380 ms",
      "Script Parse 80 ms",
      "Script Evaluation 300 ms",
    ]);
  });
});

describe("scriptCpuLabel", () => {
  it("joins lines with a middle dot", () => {
    expect(scriptCpuLabel({ totalMs: 420, scriptingMs: 300, parseMs: 80 })).toBe(
      "Total CPU Time 420 ms · Script Parse 80 ms · Script Evaluation 300 ms · Other 40 ms",
    );
  });
});
