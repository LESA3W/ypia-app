"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-copper-bright to-copper text-[#04071c] font-semibold shadow-[0_8px_24px_-10px_rgba(0,180,216,0.7)] hover:to-copper-bright hover:shadow-[0_10px_28px_-8px_rgba(77,214,240,0.8)]",
  secondary:
    "bg-surface-3 text-foreground hover:bg-[#262626] border border-line",
  outline:
    "border border-line-strong text-foreground hover:bg-surface-2",
  ghost: "text-muted hover:text-foreground hover:bg-surface-2",
  danger:
    "bg-transparent text-danger border border-danger/40 hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md gap-1.5",
  md: "h-9 px-4 text-sm rounded-md gap-2",
  icon: "h-9 w-9 rounded-md justify-center",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap transition-[background,transform,color] duration-150 ease-out",
          "active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? <span className="spin h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent" /> : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
