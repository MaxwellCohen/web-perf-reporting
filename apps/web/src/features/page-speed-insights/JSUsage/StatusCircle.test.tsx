import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusCircle } from "@/features/page-speed-insights/JSUsage/StatusCircle";

describe("StatusCircle", () => {
  it("renders gray circle when unusedBytes is not reported", () => {
    render(<StatusCircle node={{ resourceBytes: 1000 } as any} />);
    expect(screen.getByText("unused JS not reported")).toBeInTheDocument();
  });

  it("renders green circle when unused percent is low (<= 25%)", () => {
    render(<StatusCircle node={{ resourceBytes: 100, unusedBytes: 20 } as any} />);
    expect(screen.getByText("unused Js in a good state")).toBeInTheDocument();
  });

  it("renders yellow circle when unused percent is between 25% and 90%", () => {
    render(<StatusCircle node={{ resourceBytes: 100, unusedBytes: 50 } as any} />);
    expect(screen.getByText("warning this function could have extra JS")).toBeInTheDocument();
  });

  it("renders red circle when unused percent is over 90%", () => {
    render(<StatusCircle node={{ resourceBytes: 100, unusedBytes: 95 } as any} />);
    expect(screen.getByText("warning this function could have extra JS")).toBeInTheDocument();
  });

  it("uses resourceBytes default of 1 when not provided to avoid division by zero", () => {
    render(<StatusCircle node={{ unusedBytes: 1 } as any} />);
    expect(screen.getByText("warning this function could have extra JS")).toBeInTheDocument();
  });
});
