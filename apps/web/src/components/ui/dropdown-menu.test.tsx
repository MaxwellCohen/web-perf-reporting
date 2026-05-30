import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@radix-ui/react-dropdown-menu", () => {
  const createDiv = (displayName: string) => {
    const Component = React.forwardRef<
      HTMLDivElement,
      React.HTMLAttributes<HTMLDivElement> & { inset?: boolean; sideOffset?: number }
    >(({ children, sideOffset, ...props }, ref) => (
      <div ref={ref} data-side-offset={sideOffset} {...props}>
        {children}
      </div>
    ));
    Component.displayName = displayName;
    return Component;
  };

  const createButton = (displayName: string) => {
    const Component = React.forwardRef<
      HTMLButtonElement,
      React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
    >(({ children, asChild, ...props }, ref) =>
      asChild ? (
        <>{children}</>
      ) : (
        <button ref={ref} type="button" {...props}>
          {children}
        </button>
      ),
    );
    Component.displayName = displayName;
    return Component;
  };

  return {
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Trigger: createButton("Trigger"),
    Group: createDiv("Group"),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Sub: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    RadioGroup: createDiv("RadioGroup"),
    SubTrigger: createButton("SubTrigger"),
    SubContent: createDiv("SubContent"),
    Content: createDiv("Content"),
    Item: createDiv("Item"),
    CheckboxItem: createDiv("CheckboxItem"),
    RadioItem: createDiv("RadioItem"),
    Label: createDiv("Label"),
    Separator: createDiv("Separator"),
    ItemIndicator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import { DropdownMenuContent } from "@/components/ui/dropdown-menu";

describe("DropdownMenuContent", () => {
  it("uses positioned menu styles instead of a fullscreen overlay", () => {
    render(<DropdownMenuContent data-testid="content">Filters</DropdownMenuContent>);

    const content = screen.getByTestId("content");
    expect(content).toHaveClass("min-w-[8rem]", "bg-popover", "p-1");
    expect(content).not.toHaveClass("fixed", "inset-0", "bg-black/80");
    expect(content).toHaveAttribute("data-side-offset", "4");
  });
});
