"use client";

import { useTranslations } from "next-intl";
import { usePoll } from "@/hooks/use-poll";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/states";
import { Mono } from "@/components/common/mono";
import { Icon } from "@/components/ui/icon";
import { cn, formatDateTime } from "@/lib/utils";
import type { LogEntry } from "@/lib/types";

interface LogsData {
  available: boolean;
  logs: LogEntry[];
  note: string;
}

const LEVEL_TONE = {
  error: "danger",
  warning: "warn",
  info: "info",
  unknown: "muted",
} as const;

export default function LogsPage() {
  const t = useTranslations("logs");
  const { data, isValidating, mutate } = usePoll<LogsData>("/api/logs?limit=200", 5000);

  return (
    <div className="fade-up">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon="logs" onRefresh={() => mutate()} isValidating={isValidating} />

      {data?.note && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-muted">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-info" />
          {data.note}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {!data ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : data.logs.length === 0 ? (
            <EmptyState message={data.available ? t("noLogs") : t("unavailable")} icon="logs" />
          ) : (
            <ul className="divide-y divide-line">
              {data.logs.map((l, i) => (
                <li key={i} className="flex items-start gap-3 px-3.5 py-2 text-xs">
                  <Mono className="shrink-0 text-muted-2">{formatDateTime(l.timestamp)}</Mono>
                  <Badge tone={LEVEL_TONE[l.level]} className="shrink-0">
                    {l.level}
                  </Badge>
                  {l.status && (
                    <Mono className={cn("shrink-0", l.status >= 500 ? "text-danger" : l.status >= 400 ? "text-warn" : "text-muted-2")}>
                      {l.status}
                    </Mono>
                  )}
                  <span className="flex-1 break-all text-foreground/80">
                    {l.path ? <Mono className="text-copper-bright">{l.path} </Mono> : null}
                    {l.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
