"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePoll } from "@/hooks/use-poll";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, EmptyState } from "@/components/common/states";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { apiMutate, ApiError } from "@/lib/fetcher";
import { ScheduleCard } from "@/components/reminders/schedule-card";
import { Icon } from "@/components/ui/icon";
import type { EnrichedSchedule } from "@/lib/types";

interface RemindersData {
  schedules: EnrichedSchedule[];
  qstashError: string;
}

export default function RemindersPage() {
  const t = useTranslations("reminders");
  const { data, error, isValidating, mutate } = usePoll<RemindersData>("/api/reminders", 30000);

  return (
    <div className="stagger space-y-3">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        icon="reminders"
        onRefresh={() => mutate()}
        isValidating={isValidating}
        action={<CreateDialog onCreated={() => mutate()} />}
      />

      {error && <ErrorState message={t("genericError")} />}
      {data?.qstashError && <ErrorState message={t("qstashError", { err: data.qstashError })} />}

      {!data && !error
        ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)
        : data?.schedules.map((s) => <ScheduleCard key={s.scheduleId} s={s} onChange={() => mutate()} />)}

      {data && data.schedules.length === 0 && !data.qstashError && (
        <Card>
          <CardContent className="p-0">
            <EmptyState message={t("noSchedules")} icon="reminders" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateDialog({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("reminders");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [routineKey, setRoutineKey] = useState("");
  const [cron, setCron] = useState("");
  const [prompt, setPrompt] = useState("Rappel");
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      await apiMutate("/api/reminders/create", "POST", { routineKey, cron, prompt });
      toast(t("created"), "success");
      setOpen(false);
      setRoutineKey("");
      setCron("");
      onCreated();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("createFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="primary">
          <Icon name="add" size={15} />
          {t("create")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("createTitle")}>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted">{t("routineKey")}</label>
            <Input placeholder="matin" value={routineKey} onChange={(e) => setRoutineKey(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">{t("cronUtc")}</label>
            <Input placeholder="*/5 16-18 * * *" value={cron} onChange={(e) => setCron(e.target.value)} className="mono" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">{t("prompt")}</label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button size="sm" variant="ghost">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button size="sm" variant="primary" loading={loading} disabled={!routineKey.trim() || !cron.trim()} onClick={create}>
              {t("create")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
