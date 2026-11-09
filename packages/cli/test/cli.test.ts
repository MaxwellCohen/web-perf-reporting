import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const bin = fileURLToPath(new URL("../dist/index.js", import.meta.url));

describe("cli entry", () => {
  it("treats a positional URL as the audit target, not a subcommand", () => {
    const r = spawnSync("node", [bin, "https://example.com", "--device", "nope"], { encoding: "utf8" });
    expect(r.stderr).toContain("--device must be");
    expect(r.stderr).not.toContain("Unknown command");
  });

  it("routes trace to the trace CLI", () => {
    const r = spawnSync("node", [bin, "trace", "--help"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("web-perf-report trace");
    expect(r.stdout).toContain("scan");
  });

  it("rejects bad trace options before parsing the trace", () => {
    const badFormat = spawnSync("node", [bin, "trace", "f.json", "--format", "xml"], { encoding: "utf8" });
    expect(badFormat.status).toBe(1);
    expect(badFormat.stderr).toContain("--format must be md, json or toon");

    const badCategory = spawnSync("node", [bin, "trace", "insights", "f.json", "--category", "nope"], {
      encoding: "utf8",
    });
    expect(badCategory.status).toBe(1);
    expect(badCategory.stderr).toContain("--category must be");

    const noFunction = spawnSync("node", [bin, "trace", "find", "f.json"], { encoding: "utf8" });
    expect(noFunction.status).toBe(1);
    expect(noFunction.stderr).toContain("find needs --function");
  });

  it("rejects flags that belong to another command", () => {
    const r = spawnSync("node", [bin, "trace", "insights", "f.json", "--grep", "x"], { encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("--grep is not valid for the insights command");

    const range = spawnSync("node", [bin, "trace", "navigations", "f.json", "--time-range", "0,1s"], {
      encoding: "utf8",
    });
    expect(range.status).toBe(1);
    expect(range.stderr).toContain("--time-range is not valid for the navigations command");
  });

  it("prints command-specific help", () => {
    const r = spawnSync("node", [bin, "trace", "tasks", "--help"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("trace tasks <file>");
    expect(r.stdout).toContain("--min-duration");
    expect(r.stdout).not.toContain("--category");
  });

  it("validates numeric options before parsing the trace", () => {
    const zero = spawnSync("node", [bin, "trace", "tasks", "f.json", "--top", "0"], { encoding: "utf8" });
    expect(zero.status).toBe(1);
    expect(zero.stderr).toContain("--top must be >= 1");

    const notANumber = spawnSync("node", [bin, "trace", "tasks", "f.json", "--min-duration", "abc"], {
      encoding: "utf8",
    });
    expect(notANumber.status).toBe(1);
    expect(notANumber.stderr).toContain("--min-duration must be a number");

    const negative = spawnSync("node", [bin, "trace", "network", "f.json", "--slowest", "-3"], { encoding: "utf8" });
    expect(negative.status).toBe(1);
    expect(negative.stderr).toContain("--slowest must be >= 1");
  });
});
