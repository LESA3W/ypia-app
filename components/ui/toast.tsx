"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/icon";

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastCtx {
  toast: (message: string, tone?: ToastTone) => void;
}

const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let counter = 0;

const TONE_ICON: Record<ToastTone, IconName> = {
  success: "checkCircle",
  error: "alert",
  info: "info",
};
const TONE_COLOR: Record<ToastTone, string> = {
  success: "text-ok",
  error: "text-danger",
  info: "text-info",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++counter;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-line-strong bg-surface-3 px-3.5 py-2.5 text-sm shadow-xl fade-up"
            )}
          >
            <Icon name={TONE_ICON[t.tone]} size={16} className={cn("mt-0.5 shrink-0", TONE_COLOR[t.tone])} />
            <span className="flex-1 text-foreground">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="text-muted-2 hover:text-foreground" aria-label="Close">
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
