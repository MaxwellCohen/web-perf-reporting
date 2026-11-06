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
});
