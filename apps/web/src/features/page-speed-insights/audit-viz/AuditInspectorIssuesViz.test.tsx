import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditInspectorIssuesViz } from "./AuditInspectorIssuesViz";
import { makeRow } from "./qualityVizTestUtils";

const issue = (issueType: string, urls: string[]) => ({
  issueType,
  subItems: { type: "subitems", items: urls.map((url) => ({ url })) },
});

describe("AuditInspectorIssuesViz", () => {
  it("collapses URLs under issue type (1 report)", () => {
    const { container } = render(
      <AuditInspectorIssuesViz
        rows={[makeRow("inspector-issues", [issue("Cookie", ["https://yt.com/a", "https://yt.com/a", "https://yt.com/b"])])]}
      />,
    );
    expect(container.textContent).toContain("Cookie");
    expect(container.textContent).toContain("2 URLs");
    expect(container.textContent).toContain("yt.com");
    expect(container.textContent).not.toContain("Mobile");
  });

  it("attributes types across reports", () => {
    const { container } = render(
      <AuditInspectorIssuesViz
        rows={[
          makeRow("inspector-issues", [issue("Cookie", ["https://yt.com/a"])], "Mobile"),
          makeRow("inspector-issues", [issue("Cookie", ["https://yt.com/a"]), issue("Mixed", ["http://x.com/1"])], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("Mobile, Desktop");
    expect(container.textContent).toContain("Mixed");
  });

  it("returns null when empty", () => {
    expect(render(<AuditInspectorIssuesViz rows={[makeRow("inspector-issues", []), makeRow("inspector-issues", [], "D")]} />).container.firstChild).toBeNull();
  });
});
