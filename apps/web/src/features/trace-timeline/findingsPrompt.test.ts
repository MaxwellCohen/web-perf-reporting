import { describe, expect, it } from "vitest";
import { buildFindingsPrompt } from "./findingsPrompt";
import { heavySnapshot } from "./testSnapshot";

describe("buildFindingsPrompt", () => {
  it("lists findings and scripts and strips fence characters", () => {
    const s = heavySnapshot();
    s.findings[0].detail = "evil ``` <script> text";
    const p = buildFindingsPrompt(s);
    expect(p).toContain("## Findings");
    expect(p).toContain("[high]");
    expect(p).toContain("app.js");
    expect(p).not.toContain("<script>");
    expect(p.match(/```/g)!.length % 2).toBe(0);
  });
});
