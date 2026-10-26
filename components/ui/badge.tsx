import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "warn" | "danger" | "muted" | "info" | "copper";

const tones: Record<Tone, string> = {
  ok: "bg-ok/12 text-ok border-ok/25",
  warn: "bg-warn/12 text-warn border-warn/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  info: "bg-info/12 text-info border-info/25",
  copper: "bg-copper/12 text-copper border-copper/25",
  muted: "bg-surface-3 text-muted border-line",
};

export function Badge({
  tone = "muted",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

export function Dot({ tone = "muted", pulse }: { tone?: Tone; pulse?: boolean }) {
  const color: Record<Tone, string> = {
    ok: "bg-ok",
    warn: "bg-warn",
    danger: "bg-danger",
    info: "bg-info",
    copper: "bg-copper",
    muted: "bg-muted-2",
  };
  return (
    <span
      className={cn("inline-block h-2 w-2 rounded-full", color[tone], pulse && "pulse-copper")}
    />
  );
}
