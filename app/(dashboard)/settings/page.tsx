"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePoll } from "@/hooks/use-poll";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mono } from "@/components/common/mono";
import { Icon } from "@/components/ui/icon";
import { CopyButton } from "@/components/common/copy-button";
import { HeartbeatCard } from "@/components/settings/heartbeat-card";
import { TelegramCard } from "@/components/settings/telegram-card";
import { AppearanceCard } from "@/components/settings/appearance-card";
import { apiMutate } from "@/lib/fetcher";
import type { PingResult } from "@/lib/types";

interface EnvVar {
  name: string;
  group: string;
  present: boolean;
  masked: string;
  secret: boolean;
}
interface SystemPromptData {
  prompt: string;
  snapshotDate: string;
  dynamicParts: string[];
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const envData = usePoll<{ vars: EnvVar[] }>("/api/settings/env");
  const sysData = usePoll<SystemPromptData>("/api/settings/system-prompt");
  const [pings, setPings] = useState<Record<string, PingResult | "loading">>({});
  const [checking, setChecking] = useState(false);

  const PING_TARGETS = [
    { key: "kv", label: t("pingRedis") },
    { key: "qstash", label: t("pingQstash") },
    { key: "anthropic", label: t("pingAnthropic") },
    { key: "vercel", label: t("pingVercel") },
    { key: "bot", label: t("pingBot") },
  ];

  async function pingAll() {
    setChecking(true);
    setPings(Object.fromEntries(PING_TARGETS.map((tg) => [tg.key, "loading" as const])));
    await Promise.all(
      PING_TARGETS.map(async (tg) => {
        const res = await apiMutate<PingResult>("/api/settings/ping", "POST", { target: tg.key }).catch(() => ({
          target: tg.key,
          ok: false,
          latencyMs: 0,
          detail: "error",
        }));
        setPings((p) => ({ ...p, [tg.key]: res }));
      })
    );
    setChecking(false);
  }

  const groups = envData.data ? [...new Set(envData.data.vars.map((v) => v.group))] : [];

  return (
    <div className="fade-up space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} icon="settings" />

      <AppearanceCard />

      <HeartbeatCard />

      <TelegramCard />

      <Card>
        <CardHeader>
          <CardTitle>{t("connections")}</CardTitle>
          <Button size="sm" variant="secondary" loading={checking} onClick={pingAll}>
            <Icon name="refresh" size={14} className={checking ? "spin" : undefined} />
            {t("checkAll")}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {PING_TARGETS.map((tg) => {
            const r = pings[tg.key];
            const tone = r === "loading" || !r ? "muted" : r.ok ? "ok" : "danger";
            return (
              <div
                key={tg.key}
                className="flex cursor-default select-none items-center gap-2 rounded-md border border-line bg-surface-2 px-3 py-1.5 text-sm text-foreground/90"
              >
                {r === "loading" ? (
                  <span className="spin h-3 w-3 rounded-full border-2 border-copper-bright border-t-transparent" />
                ) : (
                  <Dot tone={tone} />
                )}
                <span>{tg.label}</span>
                {r && r !== "loading" && (
                  <span className={r.ok ? "text-[10px] text-muted-2" : "text-[10px] text-danger"}>
                    {r.ok ? `${r.latencyMs}ms` : t("failed")}
                  </span>
                )}
              </div>
            );
          })}
        </CardContent>
        {Object.entries(pings).some(([, r]) => r !== "loading" && !(r as PingResult).ok) && (
          <CardContent className="pt-0">
            {Object.entries(pings).map(([k, r]) =>
              r !== "loading" && !(r as PingResult).ok ? (
                <p key={k} className="text-[11px] text-error-text">
                  {k}: {(r as PingResult).detail}
                </p>
              ) : null
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("envVars")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!envData.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            groups.map((g) => (
              <div key={g}>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-2">{g}</div>
                <div className="space-y-1">
                  {envData.data!.vars
                    .filter((v) => v.group === g)
                    .map((v) => (
                      <div key={v.name} className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface-2 px-3 py-1.5">
                        <Mono className="shrink-0 text-xs">{v.name}</Mono>
                        <div className="flex min-w-0 items-center justify-end gap-2">
                          {v.present ? (
                            <Mono className="break-all text-right text-[11px] text-muted">{v.masked}</Mono>
                          ) : (
                            <Badge tone="danger">{t("absent")}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("systemPrompt")}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge tone="muted">{t("readOnly")}</Badge>
            {sysData.data && <CopyButton value={sysData.data.prompt} />}
          </div>
        </CardHeader>
        <CardContent>
          {!sysData.data ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <p className="mb-2 text-[11px] text-muted-2">
                {t("snapshotNote", { date: sysData.data.snapshotDate, parts: sysData.data.dynamicParts.join(", ") })}
              </p>
              <pre className="mono max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-line bg-surface-2 p-3 text-[11px] leading-relaxed text-foreground/80">
                {sysData.data.prompt}
              </pre>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
