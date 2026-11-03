"use client";
import { createContext, useContext, type ReactNode } from "react";

const EmbeddedDetailsContext = createContext(false);

/**
 * Marks descendant details as embedded in a parent that already supplies a title,
 * so they skip their own accordion chrome.
 */
export function EmbeddedDetails({ children }: { children: ReactNode }) {
  return <EmbeddedDetailsContext.Provider value={true}>{children}</EmbeddedDetailsContext.Provider>;
}

export function useIsEmbeddedDetails() {
  return useContext(EmbeddedDetailsContext);
}
