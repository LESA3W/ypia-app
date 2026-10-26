"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-foreground",
      "placeholder:text-muted-2 outline-none transition-colors",
      "focus:border-copper/60 focus:bg-surface-3 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-foreground",
      "placeholder:text-muted-2 outline-none transition-colors resize-none",
      "focus:border-copper/60 focus:bg-surface-3 disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
