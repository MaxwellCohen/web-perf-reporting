import { describe, expect, it } from "vitest";
import { groupMainThreadTasks } from "./groupMainThreadTasks";

describe("groupMainThreadTasks", () => {
  it("keeps long tasks alone and merges adjacent shorts", () => {
    const groups = groupMainThreadTasks([
      { startTime: 0, duration: 20 },
      { startTime: 5, duration: 10 },
      { startTime: 100, duration: 60 },
      { startTime: 200, duration: 15 },
    ]);

    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(2);
    expect(groups[1]).toHaveLength(1);
    expect(groups[1]![0]!.duration).toBe(60);
    expect(groups[2]).toHaveLength(1);
  });
});
