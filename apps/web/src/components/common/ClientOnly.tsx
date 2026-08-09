"use client";

import { use } from "react";
import { browser } from "react-dom";

export function ClientOnly({ children }: { children: React.ReactNode }) {
  use(browser());
  return <>{children}</>;
}
