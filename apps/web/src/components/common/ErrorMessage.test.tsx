import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorMessage } from "@/components/common/ErrorMessage";

vi.mock("lucide-react", () => ({
  AlertCircle: () => <span data-testid="alert-icon" />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    asChild,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    onClick?: () => void;
    [k: string]: unknown;
  }) =>
    asChild ? (
      <>{children}</>
    ) : (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function ThrowingChild({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorMessage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorMessage>
        <p>ok</p>
      </ErrorMessage>,
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("renders the default error state and recovery actions when a child throws", () => {
    render(
      <ErrorMessage>
        <ThrowingChild message="Failed to load PageSpeed Insights report." />
      </ErrorMessage>,
    );
    expect(screen.getByText("Failed to Load Report")).toBeInTheDocument();
    expect(screen.getByText(/couldn't load the PageSpeed Insights data/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try Again" })).toHaveAttribute("href", "/page-speed");
    expect(screen.getByRole("link", { name: "Go to Homepage" })).toHaveAttribute("href", "/");
  });

  it("renders custom copy when a child throws", () => {
    render(
      <ErrorMessage title="Custom Error" description="A more specific message.">
        <ThrowingChild message="Something went wrong." />
      </ErrorMessage>,
    );
    expect(screen.getByText("Custom Error")).toBeInTheDocument();
    expect(screen.getByText("A more specific message.")).toBeInTheDocument();
    expect(screen.queryByText("Failed to Load Report")).not.toBeInTheDocument();
  });
});
