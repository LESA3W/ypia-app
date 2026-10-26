"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { usePoll } from "@/hooks/use-poll";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Badge, Dot } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/states";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn, formatUsd, relativeTime } from "@/lib/utils";
import { humanizeCron } from "@/lib/humanize-cron";
import { BotPower } from "@/components/overview/bot-power";
import { OpenInTelegram } from "@/components/common/open-in-telegram";
import type { OverviewSnapshot, RoutineView, RoutineStatus } from "@/lib/types";

type Tone = "ok" | "warn" | "danger" | "muted" | "info";
const STATUS_TONE: Record<RoutineStatus, Tone> = {
  confirmed: "ok",
  pending: "muted",
  "in-window": "info",
  "fired-unconfirmed": "warn",
  missed: "danger",
};
const STATUS_KEY: Record<RoutineStatus, string> = {
  confirmed: "confirmed",
  pending: "pending",
  "in-window": "inWindow",
  "fired-unconfirmed": "firedUnconfirmed",
  missed: "missed",
};

export default function OverviewPage() {
  const t = useTranslations("overview");
  const ts = useTranslations("status");
  const { data, error, isValidating, mutate } = usePoll<
    OverviewSnapshot & { lastActivityMs: number | null; heartbeatMs: number | null; costIsReal: boolean }
  >("/api/overview", 5000);

  const alerts: string[] = [];
  if (data) {
    const hbAgeMin = data.heartbeatMs ? Math.round((Date.now() - data.heartbeatMs) / 60_000) : null;
    if (hbAgeMin !== null && hbAgeMin > 25) {
      alerts.push(t("botDown", { min: hbAgeMin }));
    } else if (data.heartbeatMs == null && data.lastActivityMs && Date.now() - data.lastActivityMs > 3 * 3600_000) {
      alerts.push(t("botSilent", { h: Math.round((Date.now() - data.lastActivityMs) / 3600_000) }));
    }
    for (const r of data.routines) {
      if (r.status === "missed") alerts.push(t("routineMissed", { label: r.label, window: r.windowLabelLA }));
    }
  }

  return (
    <div className="fade-up">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        icon="overview"
        onRefresh={() => mutate()}
        isValidating={isValidating}
        action={data?.heartbeatMs ? <HeartbeatPill ms={data.heartbeatMs} /> : undefined}
      />

      {error && <ErrorState message={t("subtitle")} />}

      <BotPower />

      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-error-text fade-up"
            >
              <Icon name="alert" size={16} />
              {a}
            </div>
          ))}
        </div>
      )}

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Cost — hero, real if an admin key is configured, else estimate */}
        <SpotlightCard className="lift col-span-2">
          <CardContent className="flex h-full flex-col p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
                <Icon name="cost" size={16} />
                {t("cost")}
              </span>
              {data && (
                <Badge tone={data.costIsReal ? "ok" : "muted"}>
                  {data.costIsReal ? t("real") : t("estimate")}
                </Badge>
              )}
            </div>
            {!data ? (
              <Skeleton className="h-12 w-32" />
            ) : (
              <div className="font-display text-4xl font-bold leading-none tracking-tight md:text-5xl">
                {formatUsd(data.cost.estimatedUsd)}
              </div>
            )}
            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
              <span className="text-[11px] text-muted-2">
                {data ? t("costHint", { count: data.cost.assistantMsgs }) : ""}
              </span>
              <a
                href="https://platform.claude.com/workspaces/default/cost"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-copper-bright transition-colors hover:border-line-strong hover:bg-surface-3"
              >
                {t("costDashboard")}
              </a>
            </div>
          </CardContent>
        </SpotlightCard>
        <StatCard
          icon="messages"
          label={t("messages")}
          value={data ? String(data.cost.messageCount) : null}
          hint={data ? t("messagesHint", { in: data.cost.userMsgs, out: data.cost.assistantMsgs }) : undefined}
        />
        <StatCard
          icon="alert"
          label={t("errors24h")}
          value={data ? (data.errorRate.available ? `${data.errorRate.pct.toFixed(0)}%` : t("na")) : null}
          hint={
            data
              ? data.errorRate.available
                ? t("errorsHint", { errors: data.errorRate.errors, total: data.errorRate.total })
                : t("errorsNa")
              : undefined
          }
          tone={data?.errorRate.available && data.errorRate.pct > 10 ? "danger" : undefined}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MessageCard icon="arrowDownLeft" label={t("lastIn")} entry={data?.lastIn ?? null} loading={!data && !error} noMsg={t("noMessage")} />
        <MessageCard
          icon="arrowUpRight"
          label={t("lastOut")}
          entry={data?.lastOut ?? null}
          loading={!data && !error}
          activityMs={data?.lastActivityMs}
          noMsg={t("noMessage")}
        />
      </div>

      <h2 className="mb-2 mt-6 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{t("routines")}</h2>
      <Card>
        <CardContent className="p-0">
          {!data && !error ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {data?.routines.map((r) => (
                <RoutineRow key={r.key} r={r} label={ts(STATUS_KEY[r.status])} tone={STATUS_TONE[r.status]} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <QuickLink href="/chat" label={t("quickSend")} icon="chat" />
        <QuickLink href="/reminders" label={t("quickRoutines")} icon="reminders" />
        <QuickLink href="/logs" label={t("quickLogs")} icon="logs" />
        <OpenInTelegram />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string | null;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <SpotlightCard className="lift">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <Icon name={icon} size={16} />
          <span className="text-[11px] font-medium uppercase tracking-[0.1em]">{label}</span>
        </div>
        {value === null ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div
            className={cn(
              "font-display text-[28px] font-bold leading-none tracking-tight",
              tone === "danger" ? "text-danger" : "text-foreground"
            )}
          >
            {value}
          </div>
        )}
        {hint && <div className="mt-1.5 text-[11px] text-muted-2">{hint}</div>}
      </CardContent>
    </SpotlightCard>
  );
}

function MessageCard({
  icon,
  label,
  entry,
  loading,
  activityMs,
  noMsg,
}: {
  icon: IconName;
  label: string;
  entry: OverviewSnapshot["lastIn"];
  loading: boolean;
  activityMs?: number | null;
  noMsg: string;
}) {
  const locale = useLocale();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            <Icon name={icon} size={14} />
            {label}
          </span>
          {activityMs ? <span className="text-[11px] text-muted-2">{relativeTime(activityMs, locale)}</span> : null}
        </div>
        {loading ? (
          <Skeleton className="h-10 w-full" />
        ) : entry ? (
          <p className="line-clamp-3 break-anywhere text-sm text-foreground/90">{entry.content || noMsg}</p>
        ) : (
          <p className="text-sm text-muted-2">{noMsg}</p>
        )}
      </CardContent>
    </Card>
  );
}

function RoutineRow({ r, label, tone }: { r: RoutineView; label: string; tone: Tone }) {
  const tc = useTranslations("cron");
  const locale = useLocale();
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Dot tone={tone} pulse={r.status === "in-window"} />
        <div className="min-w-0">
          <div className="text-sm font-medium">{r.label}</div>
          <div className="text-[11px] text-muted-2">{humanizeCron(r.cron, tc, locale)}</div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <Badge tone={tone}>{label}</Badge>
      </div>
    </li>
  );
}

function HeartbeatPill({ ms }: { ms: number }) {
  const locale = useLocale();
  const alive = Date.now() - ms < 25 * 60_000;
  return (
    <span
      className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[11px] text-muted-2"
      title={`Heartbeat ${relativeTime(ms, locale)}`}
    >
      <Dot tone={alive ? "ok" : "danger"} pulse={alive} />
      <Icon name="pulse" size={13} />
    </span>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: IconName }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md border border-line bg-surface-2 px-3.5 py-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-foreground"
    >
      <Icon name={icon} size={16} />
      {label}
    </Link>
  );
}
