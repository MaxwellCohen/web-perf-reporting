"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { cn } from "@/lib/cn";

const NAV_LINKS: { href: Route; label: string }[] = [
  { href: "/latest-crux", label: "Latest" },
  { href: "/historical-crux", label: "Historical" },
  { href: "/page-speed", label: "Insights" },
  { href: "/viewer", label: "Viewer" },
  { href: "/trace", label: "Trace" },
];

function isCurrentSection(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md print:hidden">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5"
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <VitalMark />
          <span className="truncate text-sm font-semibold tracking-tight">
            Web Performance
            <span className="font-medium text-muted-foreground"> Reporting</span>
          </span>
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="primary-menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <ul
          id="primary-menu"
          className={cn(
            "w-full flex-col gap-0.5 rounded-lg bg-secondary p-1",
            open ? "flex" : "hidden",
            "md:flex md:w-auto md:shrink-0 md:flex-row md:items-center",
          )}
        >
          {NAV_LINKS.map((link) => {
            const active = isCurrentSection(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block whitespace-nowrap rounded-md px-2.5 py-2 md:py-1 text-sm font-medium no-underline transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function VitalMark() {
  return (
    <span aria-hidden="true" className="flex h-5 shrink-0 items-end gap-0.5">
      <span className="h-2 w-1 rounded-[1px] bg-chart-3" />
      <span className="h-3.5 w-1 rounded-[1px] bg-chart-2" />
      <span className="h-5 w-1 rounded-[1px] bg-chart-1" />
    </span>
  );
}
