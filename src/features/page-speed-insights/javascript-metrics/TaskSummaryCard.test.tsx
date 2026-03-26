import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaskSummaryCard } from "@/features/page-speed-insights/javascript-metrics/TaskSummaryCard";

describe("TaskSummaryCard", () => {
  it("returns null when no metrics have totalTasks > 0", () => {
    const { container } = render(
      <TaskSummaryCard
        metrics={[
          {
            label: "Mobile",
            diagnostics: [],
            mainThreadTasks: [],
          },
        ]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders stats from diagnostics item", () => {
    const { container } = render(
      <TaskSummaryCard
        metrics={[
          {
            label: "Mobile",
            diagnostics: [
              {
                numTasks: 10,
                totalTaskTime: 500,
                numTasksOver10ms: 2,
                numTasksOver25ms: 1,
                numTasksOver50ms: 0,
                numTasksOver100ms: 0,
                numTasksOver500ms: 0,
              },
            ],
            mainThreadTasks: [],
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("calculates from mainThreadTasks when diagnostics missing", () => {
    const { container } = render(
      <TaskSummaryCard
        metrics={[
          {
            label: "Desktop",
            diagnostics: [],
            mainThreadTasks: [{ duration: 50 }, { duration: 30 }] as any,
          },
        ]}
      />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
