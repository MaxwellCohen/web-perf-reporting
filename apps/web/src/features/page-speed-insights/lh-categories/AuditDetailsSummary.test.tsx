import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AuditDetailsSummary,
  SmallText,
} from "@/features/page-speed-insights/lh-categories/AuditDetailsSummary";

vi.mock("react-markdown", () => ({
  default: ({
    children,
    components,
  }: {
    children: string;
    components?: {
      a?: (props: { href?: string; children?: React.ReactNode }) => React.ReactNode;
      p?: (props: { children?: React.ReactNode }) => React.ReactNode;
    };
  }) => {
    const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(children);
    if (linkMatch && components?.a) {
      const [, text, href] = linkMatch;
      const before = children.slice(0, linkMatch.index);
      const after = children.slice(linkMatch.index! + linkMatch[0].length);
      const body = (
        <>
          {before}
          {components.a({ href, children: text })}
          {after}
        </>
      );
      return components.p ? components.p({ children: body }) : <div>{body}</div>;
    }
    return <div>{children}</div>;
  },
}));

vi.mock("@/features/page-speed-insights/ScoreDisplay", () => ({
  ScoreDisplay: ({ audit, device }: { audit: unknown; device: string }) => (
    <div data-testid="score" data-device={device}>
      {String((audit as { id?: string })?.id ?? "")}
    </div>
  ),
}));

describe("AuditDetailsSummary", () => {
  it("renders title and acronym", () => {
    const auditData = [
      {
        id: "audit-1",
        title: "First Contentful Paint",
        score: null,
        scoreDisplayMode: "numeric" as const,
      },
    ];
    const { container } = render(
      <AuditDetailsSummary auditData={auditData} labels={["Mobile"]} acronym="FCP" />,
    );
    expect(container.textContent).toContain("First Contentful Paint");
    expect(container.textContent).toContain("(FCP)");
  });

  it("renders ScoreDisplay for each audit", () => {
    const auditData = [
      { id: "a1", title: "A", score: null, scoreDisplayMode: "numeric" as const },
      { id: "a2", title: "B", score: null, scoreDisplayMode: "numeric" as const },
    ];
    const { container } = render(
      <AuditDetailsSummary auditData={auditData} labels={["Mobile", "Desktop"]} />,
    );
    expect(container.querySelectorAll('[data-testid="score"]')).toHaveLength(2);
  });

  it("renders Not Applicable when scoreDisplayMode is notApplicable", () => {
    const auditData = [
      { id: "a1", title: "A", score: null, scoreDisplayMode: "notApplicable" as const },
    ];
    const { container } = render(<AuditDetailsSummary auditData={auditData} labels={["Mobile"]} />);
    expect(container.textContent).toContain("Not Applicable");
  });

  it("renders Manual validation when scoreDisplayMode is manual", () => {
    const auditData = [{ id: "a1", title: "A", score: null, scoreDisplayMode: "manual" as const }];
    const { container } = render(<AuditDetailsSummary auditData={auditData} labels={["Mobile"]} />);
    expect(container.textContent).toContain("Manual validation required");
  });

  it("renders description when present", () => {
    const auditData = [
      {
        id: "a1",
        title: "A",
        score: null,
        scoreDisplayMode: "numeric" as const,
        description: "Fix this issue. [Learn more](https://example.com).",
      },
    ];
    const { container, getByRole } = render(
      <AuditDetailsSummary auditData={auditData} labels={["Mobile"]} />,
    );
    expect(container.textContent).toContain("Fix this issue");
    const link = getByRole("link", { name: "Learn more" });
    expect(link.getAttribute("href")).toBe("https://example.com");
  });

  it("stops link click propagation so accordion triggers still receive clicks", () => {
    const parentClick = vi.fn();
    const auditData = [
      {
        id: "a1",
        title: "A",
        score: null,
        scoreDisplayMode: "numeric" as const,
        description: "See [docs](https://example.com/docs).",
      },
    ];
    const { getByRole } = render(
      <button type="button" onClick={parentClick}>
        <AuditDetailsSummary auditData={auditData} labels={["Mobile"]} />
      </button>,
    );
    getByRole("link", { name: "docs" }).click();
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe("SmallText", () => {
  it("returns null when text is null", () => {
    const { container } = render(<SmallText text={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders text when provided", () => {
    const { container } = render(<SmallText text="Hello" />);
    expect(container.textContent).toContain("Hello");
  });
});
