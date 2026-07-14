"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * A lightweight virtualizer for variable-height items.
 * Since true virtualization without libraries is complex (due to dynamic heights),
 * this hook implements a simplified "render window" approach.
 * It renders a generous chunk of items around the current scroll position,
 * avoiding the rendering of thousands of DOM nodes while keeping scroll smooth.
 */
export function useVirtualScroll<T>({ items, itemHeightEstimate = 80, overscan = 20 }: { items: T[], itemHeightEstimate?: number, overscan?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(800);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };
    
    const handleResize = () => {
      setContainerHeight(el.clientHeight);
    };
    
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    
    handleResize();
    handleScroll();
    
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Calculate visible range (simplified assumption of average height)
  // We use a large overscan to prevent blank spaces during fast scrolling
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeightEstimate) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeightEstimate) + (overscan * 2);
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  // We need to pad the top and bottom to maintain scroll position
  const paddingTop = startIndex * itemHeightEstimate;
  const paddingBottom = Math.max(0, (items.length - endIndex) * itemHeightEstimate);

  return {
    containerRef,
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    paddingTop,
    paddingBottom,
  };
}
