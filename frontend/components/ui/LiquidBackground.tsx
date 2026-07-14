"use client";

import { useEffect, useRef } from "react";

export function LiquidBackground({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Specular highlights and tilt for .glass panels
    const panels = Array.from(document.querySelectorAll(".glass")) as HTMLElement[];
    const state = new Map<HTMLElement, any>();

    panels.forEach((panel) => {
      if (!panel.querySelector(".spec")) {
        const spec = document.createElement("div");
        spec.className = "spec";
        panel.insertBefore(spec, panel.firstChild);
      }
      state.set(panel, { curX: 0, curY: 0, targetX: 0, targetY: 0, lastRipple: 0 });
    });

    const MAX_TILT = 3;
    const SPRING = 0.08;
    const RIPPLE_MIN_DIST = 46;

    const spawnRipple = (panel: HTMLElement, x: number, y: number) => {
      const ripple = document.createElement("div");
      ripple.className = "ripple";
      ripple.style.left = x + "px";
      ripple.style.top = y + "px";
      panel.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    };

    const handlePointer = (panel: HTMLElement, clientX: number, clientY: number, spawnRing: boolean) => {
      const rect = panel.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const px = x / rect.width;
      const py = y / rect.height;

      const s = state.get(panel);
      if (!s) return;

      s.targetY = (px - 0.5) * MAX_TILT * 2;
      s.targetX = -(py - 0.5) * MAX_TILT * 2;

      const spec = panel.querySelector(".spec") as HTMLElement;
      if (spec) {
        spec.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.18), transparent 45%)`;
      }

      if (spawnRing) {
        const dist = Math.hypot(x - (s.lastX || 0), y - (s.lastY || 0));
        if (dist > RIPPLE_MIN_DIST || s.lastRipple === 0) {
          spawnRipple(panel, x, y);
          s.lastX = x;
          s.lastY = y;
          s.lastRipple = performance.now();
        }
      }
    };

    const pointerEnter = function(this: HTMLElement) { this.classList.add("hovering"); };
    const pointerLeave = function(this: HTMLElement) {
      this.classList.remove("hovering");
      const s = state.get(this);
      if (s) { s.targetX = 0; s.targetY = 0; }
    };
    const pointerMove = function(this: HTMLElement, e: PointerEvent) { handlePointer(this, e.clientX, e.clientY, true); };
    const pointerDown = function(this: HTMLElement, e: PointerEvent) {
      handlePointer(this, e.clientX, e.clientY, false);
      const rect = this.getBoundingClientRect();
      spawnRipple(this, e.clientX - rect.left, e.clientY - rect.top);
    };

    panels.forEach((panel) => {
      panel.addEventListener("pointerenter", pointerEnter);
      panel.addEventListener("pointerleave", pointerLeave);
      panel.addEventListener("pointermove", pointerMove as EventListener);
      panel.addEventListener("pointerdown", pointerDown as EventListener);
    });

    let animationFrame: number;
    const tick = () => {
      panels.forEach((panel) => {
        const s = state.get(panel);
        if (s) {
          s.curX += (s.targetX - s.curX) * SPRING;
          s.curY += (s.targetY - s.curY) * SPRING;
          panel.style.transform = `perspective(1200px) rotateX(${s.curX.toFixed(2)}deg) rotateY(${s.curY.toFixed(2)}deg)`;
        }
      });
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);

    return () => {
      panels.forEach((panel) => {
        panel.removeEventListener("pointerenter", pointerEnter);
        panel.removeEventListener("pointerleave", pointerLeave);
        panel.removeEventListener("pointermove", pointerMove as EventListener);
        panel.removeEventListener("pointerdown", pointerDown as EventListener);
      });
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 bg-[#0a0a0a]">
        {/* Soft radial vignette & top left lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.06),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6)_100%)]" />
      </div>
      <div className="grain"></div>

      <div ref={containerRef} className="relative z-10 w-full h-full">
        {children}
      </div>
    </>
  );
}
