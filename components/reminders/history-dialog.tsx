"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher } from "@/lib/fetcher";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/states";
import { Mono } from "@/components/common/mono";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/utils";
import type { QStashEvent } from "@/lib/types";

function tone(state: string): "ok" | "danger" | "warn" | "muted" {
  const s = state.toLowerCase();
  if (s.includes("delivered") || s.includes("success")) return "ok";
  if (s.includes("error") || s.includes("fail")) return "danger";
  if (s.includes("retry") || s.includes("progress")) return "warn";
  return "muted";
}

export function HistoryDialog({ scheduleId }: { scheduleId: string }) {
  const t = useTranslations("history");
  const tr = useTranslations("reminders");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSWR<{ events: QStashEvent[]; error?: string }>(
    open ? `/api/reminders/${encodeURIComponent(scheduleId)}/history` : null,
    fetcher
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Icon name="history" size={14} />
          {tr("history")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("title")} className="max-w-lg">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !data?.events?.length ? (
          <EmptyState message={data?.error ? t("unavailable", { err: data.error }) : t("noEvents")} icon="history" />
        ) : (
          <ul className="max-h-80 space-y-1.5 overflow-y-auto">
            {data.events.map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2">
                <Mono className="text-[11px] text-muted">{e.time ? formatDateTime(e.time) : "—"}</Mono>
                <Badge tone={tone(e.state)}>{e.state}</Badge>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
