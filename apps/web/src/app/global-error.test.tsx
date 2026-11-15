import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { suppressConsoleError } from "@/test-utils";
import GlobalError from "@/app/global-error";

const captureException = vi.fn<(error: Error) => void>();

vi.mock("@sentry/nextjs", () => ({
  captureException: (error: Error) => captureException(error),
}));

vi.mock("next/error", () => ({
  default: ({ statusCode }: { statusCode: number }) => <div>Next error status: {statusCode}</div>,
}));

describe("app/global-error", () => {
  beforeEach(() => suppressConsoleError());

  it("reports the error to sentry and renders the Next error page", () => {
    const error = new Error("Boom");

    render(<GlobalError error={error} />);

    expect(captureException).toHaveBeenCalledWith(error);
    expect(screen.getByText("Next error status: 0")).toBeInTheDocument();
  });
});
