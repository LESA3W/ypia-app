"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogTrigger, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { apiMutate, ApiError } from "@/lib/fetcher";
import type { EnrichedSchedule } from "@/lib/types";

export function ModifyDialog({ schedule, onDone }: { schedule: EnrichedSchedule; onDone: () => void }) {
  const t = useTranslations("reminders");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [cron, setCron] = useState(schedule.cron);
  const [routineKey, setRoutineKey] = useState(schedule.routineKey || "");
  const [prompt, setPrompt] = useState(schedule.prompt);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      await apiMutate(`/api/reminders/${encodeURIComponent(schedule.scheduleId)}/modify`, "POST", {
        cron,
        routineKey,
        prompt,
      });
      toast(t("modified"), "success");
      setOpen(false);
      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : t("modifyFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Icon name="edit" size={14} />
          {t("modify")}
        </Button>
      </DialogTrigger>
      <DialogContent title={t("modifyTitle")} className="max-w-lg">
        <div className="space-y-3">
          <p className="text-[11px] text-muted-2">{t("modifyHint")}</p>
          <div>
            <label className="mb-1 block text-xs text-muted">{t("routineKey")}</label>
            <Input value={routineKey} onChange={(e) => setRoutineKey(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">{t("cronUtc")}</label>
            <Input value={cron} onChange={(e) => setCron(e.target.value)} className="mono" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">{t("promptSystem")}</label>
            <Textarea rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mono text-xs" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button size="sm" variant="ghost">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button size="sm" variant="primary" loading={loading} disabled={!cron.trim() || !routineKey.trim()} onClick={save}>
              {tc("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
