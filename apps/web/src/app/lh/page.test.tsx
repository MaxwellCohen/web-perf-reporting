import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/lh/LhInputForm", () => ({
  LhInputForm: () => <div>Lighthouse Report Viewer</div>,
}));

import LhPage from "@/app/lh/page";

describe("app/lh/page", () => {
  it("renders LhInputForm inside a max-w container", async () => {
    const Page = await LhPage();
    const { container } = render(Page);

    expect(container.firstChild).toMatchSnapshot();
    expect(screen.getByText("Lighthouse Report Viewer")).toBeInTheDocument();
  });
});
