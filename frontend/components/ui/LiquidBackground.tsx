"use client";

import { useEffect, useRef } from "react";

export function LiquidBackground({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Specular highlights and tilt for .glass panels
    const panels = Array.from(document.querySelectorAll(".glass")) as HTMLElement[];
    const state = new Map<HTMLElement, any>();

    panels.forEach((panel) => {
      // Add spec layer if not exists
      if (!panel.querySelector(".spec")) {
        const spec = document.createElement("div");
        spec.className = "spec";
        panel.insertBefore(spec, panel.firstChild);
      }
      state.set(panel, { curX: 0, curY: 0, targetX: 0, targetY: 0, lastRipple: 0 });
    });

    const MAX_TILT = 5;
    const SPRING = 0.10;
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
        spec.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.35), transparent 45%)`;
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

    // 2. Global background warping based on cursor speed
    const dispMap = document.getElementById("dispMap");
    let lastX: number | null = null, lastY: number | null = null, lastT = performance.now();
    let energy = 0;

    const onMove = (clientX: number, clientY: number) => {
      const now = performance.now();
      if (lastX !== null && lastY !== null) {
        const dt = Math.max(now - lastT, 1);
        const dist = Math.hypot(clientX - lastX, clientY - lastY);
        const speed = dist / dt;
        energy = Math.min(energy + speed * 6, 40);
      }
      lastX = clientX; lastY = clientY; lastT = now;
    };

    const windowPointerMove = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    const windowTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    window.addEventListener("pointermove", windowPointerMove);
    window.addEventListener("touchmove", windowTouchMove, { passive: true });

    let decayFrame: number;
    const decayLoop = () => {
      energy *= 0.93;
      if (dispMap) dispMap.setAttribute("scale", (18 + energy).toFixed(1));
      decayFrame = requestAnimationFrame(decayLoop);
    };
    decayFrame = requestAnimationFrame(decayLoop);

    // Cleanup
    return () => {
      panels.forEach((panel) => {
        panel.removeEventListener("pointerenter", pointerEnter);
        panel.removeEventListener("pointerleave", pointerLeave);
        panel.removeEventListener("pointermove", pointerMove as EventListener);
        panel.removeEventListener("pointerdown", pointerDown as EventListener);
      });
      window.removeEventListener("pointermove", windowPointerMove);
      window.removeEventListener("touchmove", windowTouchMove);
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(decayFrame);
    };
  }, []);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="liquidWarp" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence id="turb" type="fractalNoise" baseFrequency="0.006 0.010" numOctaves={2} seed="7" result="noise">
            <animate attributeName="baseFrequency" dur="34s" values="0.006 0.010;0.011 0.016;0.006 0.010" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap id="dispMap" in="SourceGraphic" in2="noise" scale="24" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="liquid-bg">
        <div className="blob blob1"></div>
        <div className="blob blob2"></div>
        <div className="blob blob3"></div>
      </div>
      <div className="grain"></div>

      <div ref={containerRef} className="relative z-10 w-full h-full">
        {children}
      </div>
    </>
  );
}
