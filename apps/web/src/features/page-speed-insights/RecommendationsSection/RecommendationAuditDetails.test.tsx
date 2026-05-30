import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecommendationAuditDetails } from "@/features/page-speed-insights/RecommendationsSection/RecommendationAuditDetails";

vi.mock("@/features/page-speed-insights/RenderJSONDetails", () => ({
  RenderJSONDetails: ({
    data,
    data2,
    title,
  }: {
    data: unknown;
    data2?: unknown;
    title: string;
  }) => (
    <div data-testid="json-details" data-title={title}>
      {JSON.stringify(data)}
      {data2 != null && ` | ${JSON.stringify(data2)}`}
    </div>
  ),
}));

describe("RecommendationAuditDetails", () => {
  it("returns null when all auditData items are null/undefined", () => {
    const { container } = render(
      <RecommendationAuditDetails auditId="test-audit" auditData={[null, undefined, null]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when auditData is empty", () => {
    const { container } = render(<RecommendationAuditDetails auditId="test" auditData={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders RenderJSONDetails when auditData has at least one non-null item", () => {
    const data = { foo: "bar" };
    const { container } = render(
      <RecommendationAuditDetails auditId="my-audit" auditData={[null, data]} />,
    );
    expect(container.querySelector('[data-testid="json-details"]')).toBeTruthy();
    expect(container.querySelector('[data-title="All Data for my-audit"]')).toBeTruthy();
  });
});
