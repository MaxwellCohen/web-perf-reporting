import { useEffect, useState } from "react";

/** Tracks an element's rendered height. Attach `ref` to the element to measure. */
export function useElementHeight<T extends HTMLElement>() {
  const [element, ref] = useState<T | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setHeight(element.getBoundingClientRect().height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref, height };
}
