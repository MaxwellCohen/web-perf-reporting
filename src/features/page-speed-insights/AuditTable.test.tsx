import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

import { AuditTable } from "@/features/page-speed-insights/AuditTable";

describe("AuditTable", () => {
  it("returns null when audits is undefined", () => {
    const { container } = render(<AuditTable />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when audits is null", () => {
    const { container } = render(<AuditTable audits={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Audits heading and table with audit entries", () => {
    const audits = {
      "first-contentful-paint": {
        id: "first-contentful-paint",
        title: "First Contentful Paint",
        description: "FCP measures when the first content is painted.",
        score: 0.9,
        scoreDisplayMode: "numeric" as const,
      },
      "largest-contentful-paint": {
        id: "largest-contentful-paint",
        title: "Largest Contentful Paint",
        description: "LCP measures when the largest content is painted.",
        score: 0.85,
        scoreDisplayMode: "numeric" as const,
      },
    };

    const { container } = render(<AuditTable audits={audits} />);

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getAllByText("first-contentful-paint").length).toBeGreaterThan(0);
    expect(screen.getAllByText("largest-contentful-paint").length).toBeGreaterThan(0);
  });

  it("renders markdown in description", () => {
    const audits = {
      "test-audit": {
        id: "test-audit",
        title: "Test",
        description: "**Bold** text",
        score: 1,
        scoreDisplayMode: "binary" as const,
      },
    };

    const { container } = render(<AuditTable audits={audits} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders empty string when description is missing", () => {
    const audits = {
      "test-audit": {
        id: "test-audit",
        title: "Test",
        score: 1,
        scoreDisplayMode: "binary" as const,
      },
    };

    const { container } = render(<AuditTable audits={audits} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
