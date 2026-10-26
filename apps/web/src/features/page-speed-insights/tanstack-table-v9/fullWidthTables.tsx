"use client";

import { createContext, useContext, type ReactNode } from "react";

const FullWidthTablesContext = createContext(false);

/** Tables under this provider stretch to the container instead of their column sum. */
export function FullWidthTables({ children }: { children: ReactNode }) {
  return <FullWidthTablesContext.Provider value={true}>{children}</FullWidthTablesContext.Provider>;
}

export function useFullWidthTables() {
  return useContext(FullWidthTablesContext);
}
