"use client";

import { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface UnreadValue {
  unread: number;
  markRead: (value?: number) => void;
}

const UnreadCtx = createContext<UnreadValue>({ unread: 0, markRead: () => {} });
export const useUnread = () => useContext(UnreadCtx);

const KEY = "chatSeenTotal";

/** Tracks how many new messages arrived since the chat was last viewed. */
export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSWR<{ total: number }>("/api/chat/count", fetcher, { refreshInterval: 15000 });
  const total = data?.total ?? 0;
  const [seen, setSeen] = useState<number | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    setSeen(raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null);
  }, []);

  // baseline: first time we learn the total with no stored marker → no badge
  useEffect(() => {
    if (seen == null && data) {
      setSeen(total);
      localStorage.setItem(KEY, String(total));
    }
  }, [data, seen, total]);

  const unread = seen == null ? 0 : Math.max(0, total - seen);

  function markRead(value?: number) {
    const v = value ?? total;
    setSeen(v);
    localStorage.setItem(KEY, String(v));
  }

  return <UnreadCtx.Provider value={{ unread, markRead }}>{children}</UnreadCtx.Provider>;
}

/** Small red bubble with a white count, anchored to a parent (which must be relative). */
export function NotifBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute -right-1.5 -top-1.5 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white shadow",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
