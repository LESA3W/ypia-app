"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CardContent } from "@/components/ui/card";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { Button } from "@/components/ui/button";
import { Badge, Dot } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mono } from "@/components/common/mono";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { apiMutate, ApiError } from "@/lib/fetcher";
import { cn, relativeTime } from "@/lib/utils";
import { humanizeCron } from "@/lib/humanize-cron";
import type { EnrichedSchedule, RoutineStatus } from "@/lib/types";
import { ModifyDialog } from "./modify-dialog";
import { HistoryDialog } from "./history-dialog";

type Tone = "ok" | "warn" | "danger" | "muted" | "info";
const STATUS_TONE: Record<RoutineStatus | "unknown", Tone> = {
  confirmed: "ok",
  "in-window": "info",
  pending: "muted",
  "fired-unconfirmed": "warn",
  missed: "danger",
  unknown: "muted",
};
const STATUS_KEY: Record<RoutineStatus | "unknown", string> = {
  confirmed: "ok",
  "in-window": "waiting",
  pending: "waiting",
  "fired-unconfirmed": "toConfirm",
  missed: "missed",
  unknown: "unknown",
};

export function ScheduleCard({ s, onChange }: { s: EnrichedSchedule; onChange: () => void }) {
  const t = useTranslations("reminders");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const tcron = useTranslations("cron");
  const locale = useLocale();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const tone = STATUS_TONE[s.status];
  const statusLabel = s.status === "missed" ? ts("missed") : ts(STATUS_KEY[s.status]);
  // strip the legacy "(cron LA: …)" suffix from the title — the human line covers it now
  const title = (s.desc || `Routine ${s.label}`).replace(/\s*\(cron\s*LA:.*?\)\s*$/i, "");

  async function act(name: string, fn: () => Promise<unknown>, successMsg?: string) {
    setBusy(name);
    try {
      await fn();
      if (successMsg) toast(successMsg, "success");
      setTimeout(onChange, 600);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("genericError"), "error");
    } finally {
      setBusy(null);
    }
  }

  const togglePause = () =>
    act(
      "pause",
      () =>
        apiMutate(`/api/reminders/${encodeURIComponent(s.scheduleId)}/pause`, "POST", {
          action: s.paused ? "resume" : "pause",
        }),
      s.paused ? t("enabled") : t("disabled")
    );

  const trigger = () =>
    act("exec", () => apiMutate("/api/reminders/trigger", "POST", { routineKey: s.routineKey, prompt: s.prompt }), t("executed"));

  const runIfDue = async () => {
    setBusy("ifdue");
    try {
      const res = await apiMutate<{ skipped: boolean }>("/api/reminders/trigger", "POST", {
        routineKey: s.routineKey,
        prompt: s.prompt,
        cron: s.cron,
        ifDue: true,
      });
      toast(res.skipped ? t("outOfWindow") : t("executedInWindow"), res.skipped ? "info" : "success");
      setTimeout(onChange, 600);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("genericError"), "error");
    } finally {
      setBusy(null);
    }
  };

  const clone = () =>
    act("clone", () => apiMutate(`/api/reminders/${encodeURIComponent(s.scheduleId)}/clone`, "POST"), t("cloned"));

  return (
    <SpotlightCard className={cn("lift", s.status === "missed" && "border-danger/40", s.paused && "opacity-70")}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Dot tone={tone} pulse={s.status === "in-window"} />
              <span className="font-medium">{title}</span>
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="flex items-center gap-1.5 text-sm text-foreground/85">
                <Icon name="reminders" size={14} />
                {humanizeCron(s.cron, tcron, locale)}
              </div>
              <div className="text-[11px] text-muted-2">
                {t("agent")}: <span className="text-foreground/60">main</span> ·{" "}
                <Mono className="text-[10px]">{s.cron}</Mono>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 gap-4 md:gap-5">
            <Stat label={t("statut")} value={<Badge tone={tone}>{statusLabel}</Badge>} />
            <Stat label={t("prochaine")} value={<span className="mono text-xs">{s.paused ? t("paused") : relativeTime(s.nextFireMs, locale)}</span>} />
            <Stat label={t("derniere")} value={<span className="mono text-xs">{s.lastFireMs ? relativeTime(s.lastFireMs, locale) : t("na")}</span>} />
          </div>
        </div>

        {s.prompt && (
          <div className="mt-3">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-2">{t("system")}</div>
            <div className="rounded-md border border-line bg-background p-3">
              <p className={cn("mono whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/75", !expanded && "line-clamp-4")}>
                {s.prompt}
              </p>
              {s.prompt.length > 180 && (
                <button onClick={() => setExpanded((v) => !v)} className="mt-1.5 text-[11px] text-copper-bright hover:underline">
                  {expanded ? tc("collapse") : tc("seeAll")}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <Switch checked={!s.paused} disabled={busy === "pause"} onCheckedChange={togglePause} aria-label="toggle" />
            <span className={cn("text-xs", s.paused ? "text-muted-2" : "text-ok")}>
              {s.paused ? t("disabled") : t("enabled")}
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <ModifyDialog schedule={s} onDone={onChange} />
            <Button size="sm" variant="ghost" loading={busy === "clone"} onClick={clone}>
              <Icon name="clone" size={14} />
              {t("clone")}
            </Button>
            <Button size="sm" variant="ghost" loading={busy === "exec"} onClick={trigger}>
              <Icon name="play" size={14} />
              {t("execute")}
            </Button>
            <Button size="sm" variant="ghost" loading={busy === "ifdue"} onClick={runIfDue}>
              <Icon name="bolt" size={14} />
              {t("runIfDue")}
            </Button>
            <HistoryDialog scheduleId={s.scheduleId} />
            <DeleteButton label={s.label} scheduleId={s.scheduleId} onDone={onChange} />
          </div>
        </div>
      </CardContent>
    </SpotlightCard>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-right">
      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-2">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function DeleteButton({ label, scheduleId, onDone }: { label: string; scheduleId: string; onDone: () => void }) {
  const t = useTranslations("reminders");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function del() {
    setLoading(true);
    try {
      await apiMutate(`/api/reminders/${encodeURIComponent(scheduleId)}`, "DELETE");
      toast(t("deleted"), "success");
      setOpen(false);
      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("deleteFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`${t("delete")} ${label}`} className="text-danger hover:bg-danger/10">
          <Icon name="delete" size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent title={t("deleteTitle")}>
        <p className="text-sm text-muted">{t("deleteConfirm", { id: scheduleId })}</p>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button size="sm" variant="ghost">
              {tc("cancel")}
            </Button>
          </DialogClose>
          <Button size="sm" variant="danger" loading={loading} onClick={del}>
            {t("delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
