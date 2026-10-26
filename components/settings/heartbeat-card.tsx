"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations, useLocale } from "next-intl";
import { fetcher, apiMutate, ApiError } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dot } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { relativeTime, cn } from "@/lib/utils";

interface HeartbeatStatus {
  lastMs: number | null;
  alive: boolean;
  configured: boolean;
  enabled: boolean;
  paused: boolean;
  intervalMin: number | null;
  thresholdMin: number;
}

const INTERVALS = [5, 10, 15, 30];

export function HeartbeatCard() {
  const t = useTranslations("heartbeat");
  const locale = useLocale();
  const { data, mutate } = useSWR<HeartbeatStatus>("/api/dashboard/heartbeat", fetcher, {
    refreshInterval: 10000,
  });
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(name: string, body: Record<string, unknown>, ok?: string) {
    setBusy(name);
    try {
      await apiMutate("/api/dashboard/heartbeat", "POST", body);
      await mutate();
      if (ok) toast(ok, "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Error", "error");
    } finally {
      setBusy(null);
    }
  }

  const aliveTone = data ? (data.alive ? "ok" : "danger") : "muted";
  const statusLabel = data ? (data.alive ? t("alive") : t("down")) : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {data?.configured && (
          <Switch
            checked={data.enabled}
            disabled={busy === "toggle"}
            aria-label={data.enabled ? t("disable") : t("enable")}
            onCheckedChange={() =>
              act("toggle", { action: data.enabled ? "pause" : "resume" }, data.enabled ? t("disable") : t("enable"))
            }
          />
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? (
          <Skeleton className="h-16 w-full" />
        ) : !data.configured ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">{t("notConfigured")}</p>
            <Button size="sm" variant="primary" loading={busy === "create"} onClick={() => act("create", { action: "create", intervalMin: 10 }, t("enable"))}>
              <Icon name="pulse" size={14} />
              {t("enable")}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Dot tone={aliveTone} pulse={data.alive} />
                <div>
                  <div className={cn("text-sm font-medium", data.alive ? "text-ok" : "text-danger")}>{statusLabel}</div>
                  <div className="text-[11px] text-muted-2">
                    {t("lastBeat")}: {data.lastMs ? relativeTime(data.lastMs, locale) : t("never")}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="secondary" loading={busy === "ping"} onClick={() => act("ping", { action: "ping" }, t("pingNow"))}>
                <Icon name="pulse" size={14} />
                {t("pingNow")}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-xs text-muted">{t("interval")}</span>
              <div className="flex gap-1.5">
                {INTERVALS.map((n) => (
                  <button
                    key={n}
                    disabled={busy === "interval"}
                    onClick={() => act("interval", { action: "setInterval", intervalMin: n }, `${n} ${t("min")}`)}
                    className={cn(
                      "mono rounded-md border px-2.5 py-1 text-xs transition-colors",
                      data.intervalMin === n
                        ? "border-copper/40 bg-copper/15 text-copper-bright"
                        : "border-line text-muted hover:border-line-strong hover:text-foreground"
                    )}
                  >
                    {n} {t("min")}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
