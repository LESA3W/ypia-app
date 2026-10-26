"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { fetcher, apiMutate } from "@/lib/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function BotPower() {
  const t = useTranslations("bot");
  const { data, mutate } = useSWR<{ enabled: boolean }>("/api/dashboard/bot-enabled", fetcher, {
    refreshInterval: 10000,
  });
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    // optimistic
    mutate({ enabled: next }, { revalidate: false });
    try {
      await apiMutate("/api/dashboard/bot-enabled", "POST", { enabled: next });
      toast(next ? t("active") : t("disabled"), next ? "success" : "info");
      mutate();
    } catch {
      mutate();
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <Skeleton className="mb-4 h-14 w-full rounded-[var(--radius)]" />;

  const on = data.enabled;
  return (
    <Card className={cn("mb-4", !on && "border-danger/40")}>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              on ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger"
            )}
          >
            <Icon name="power" size={18} />
          </span>
          <div>
            <div className={cn("text-sm font-semibold", on ? "text-ok" : "text-danger")}>
              {on ? t("active") : t("disabled")}
            </div>
            <div className="text-[11px] text-muted-2">{on ? t("turnOff") : t("turnOn")}</div>
          </div>
        </div>
        <Switch checked={on} disabled={busy} onCheckedChange={toggle} aria-label={on ? t("turnOff") : t("turnOn")} />
      </CardContent>
    </Card>
  );
}
