import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { AuditJsLibrariesViz } from "./AuditJsLibrariesViz";
import { makeRow } from "./qualityVizTestUtils";

describe("AuditJsLibrariesViz", () => {
  it("renders chips with versions for one report", () => {
    const { container } = render(
      <AuditJsLibrariesViz rows={[makeRow("js-libraries", [{ name: "core-js", npm: "core-js", version: "core-js-global@3.9.1" }])]} />,
    );
    expect(container.textContent).toContain("core-js 3.9.1");
    expect(container.textContent).not.toContain("only");
  });

  it("highlights libraries only detected in some reports", () => {
    const { container } = render(
      <AuditJsLibrariesViz
        rows={[
          makeRow("js-libraries", [{ name: "jQuery", version: "3.0.0" }], "Mobile"),
          makeRow("js-libraries", [{ name: "jQuery", version: "3.0.0" }, { name: "React", version: "18.0.0" }], "Desktop"),
        ]}
      />,
    );
    expect(container.textContent).toContain("React 18.0.0 (only Desktop)");
    expect(container.textContent).toContain("1 not in every report");
    expect(container.textContent).not.toContain("jQuery 3.0.0 (only");
  });

  it("returns null when empty", () => {
    expect(render(<AuditJsLibrariesViz rows={[makeRow("js-libraries", [])]} />).container.firstChild).toBeNull();
  });
});
