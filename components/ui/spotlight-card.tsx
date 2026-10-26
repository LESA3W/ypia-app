"use client";

import * as React from "react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Glass card with a cursor-following cyan spotlight (21st.dev "Spotlight Card"
 * pattern, retuned to the Modern Aurora theme). The glow tracks the pointer
 * relative to the card and fades in on enter; on touch devices the enter event
 * never fires, so it degrades to a plain glass card with no extra work.
 */
export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(77, 214, 240, 0.16)",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { spotlightColor?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "surface-card relative overflow-hidden rounded-[var(--radius)]",
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px z-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(220px circle at ${pos.x}px ${pos.y}px, rgba(144, 224, 239, 0.12), transparent 60%), radial-gradient(480px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 44%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
