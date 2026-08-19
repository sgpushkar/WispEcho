"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Tracks scroll state for the messages container.
 *
 * NOTE: This is NOT a true virtualizer — all messages are rendered to the DOM.
 * A future upgrade to react-virtual / tanstack-virtual would add real windowing.
 * For now, `visibleItems` always returns the full item list.
 */
export function useVirtualScroll<T>({ items }: { items: T[] }) {
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
    /** Distance from bottom; use to auto-scroll on new messages */
    isAtBottom,
    /** Virtual padding (reserved for future virtualisation) */
    paddingTop: 0,
    paddingBottom: 0,
  };
}
