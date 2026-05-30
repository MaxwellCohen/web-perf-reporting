import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavigationMenuItems } from "@/components/navigation/NavigationMenuItems";
import { TopNav } from "@/components/navigation/TopNav";

vi.mock("@/components/ui/navigation-menu", () => ({
  NavigationMenu: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <nav className={className}>{children}</nav>
  ),
  NavigationMenuList: ({ children }: { children: React.ReactNode }) => <ul>{children}</ul>,
  NavigationMenuItem: ({ children }: { children: React.ReactNode }) => <li>{children}</li>,
  NavigationMenuLink: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <span>{children}</span>,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("navigation components", () => {
  it("renders the top navigation links", () => {
    const { container } = render(<TopNav />);

    expect(container.querySelector('a[href="/"]')?.textContent).toContain(
      "Web Performance Reporting",
    );
    expect(container.querySelector('a[href="/latest-crux"]')?.textContent).toContain("Latest");
    expect(container.querySelector('a[href="/historical-crux"]')?.textContent).toContain(
      "Historical",
    );
    expect(container.querySelector('a[href="/page-speed"]')?.textContent).toContain("Insights");
    expect(container.querySelector('a[href="/viewer"]')?.textContent).toContain("Viewer");
  });

  it("renders the navigation menu home link", () => {
    const { container } = render(<NavigationMenuItems />);

    expect(container.querySelector('a[href="/"]')?.textContent).toContain(
      "Web Performance Reporting",
    );
  });
});
