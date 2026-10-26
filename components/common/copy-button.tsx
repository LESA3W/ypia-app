"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className={cn("text-muted-2 transition-colors hover:text-foreground", className)}
      aria-label="Copy"
    >
      <Icon name={copied ? "check" : "clone"} size={14} className={cn(copied && "text-ok")} />
    </button>
  );
}
