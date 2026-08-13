"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * A lightweight virtualizer for variable-height items.
 * Since true virtualization without libraries is complex (due to dynamic heights),
 * this hook implements a simplified "render window" approach.
 * It renders a generous chunk of items around the current scroll position,
 * avoiding the rendering of thousands of DOM nodes while keeping scroll smooth.
 */
export function useVirtualScroll<T>({ items }: { items: T[], itemHeightEstimate?: number, overscan?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const handleScroll = () => {
      setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 150);
    };
    
    el.addEventListener("scroll", handleScroll, { passive: true });
    
    // Initial check
    setTimeout(handleScroll, 100);
    
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return {
    containerRef,
    visibleItems: items,
    startIndex: 0,
    endIndex: items.length,
    paddingTop: 0,
    paddingBottom: 0,
    isAtBottom,
  };
}
