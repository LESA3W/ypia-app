import { NextResponse } from "next/server";
import { listSchedules } from "@/lib/qstash";
import { getAllRoutineConfirmed, getLastRoutineKey, getLastRoutineFireMs, getReminderRecords } from "@/lib/kv";
import {
  ROUTINE_KEYS,
  ROUTINE_LABELS,
  computeRoutineStatus,
} from "@/lib/routines";
import { nextFireMs, cronToLA, isDue } from "@/lib/cron";
import { reminderDestUrl } from "@/lib/bot";
import type { QStashSchedule, RoutineKey, EnrichedSchedule } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function labelFor(routineKey: string | null): string {
  if (routineKey && (ROUTINE_KEYS as string[]).includes(routineKey)) {
    return ROUTINE_LABELS[routineKey as RoutineKey];
  }
  return routineKey || "Schedule";
}

export async function GET() {
  const now = new Date();
  let schedules: QStashSchedule[] = [];
  let qstashError = "";
  try {
    schedules = await listSchedules();
  } catch (e) {
    qstashError = (e as Error).message.slice(0, 160);
  }

  const [confirmed, lastKey, lastFireMs, records] = await Promise.all([
    getAllRoutineConfirmed([...ROUTINE_KEYS]).catch(() => ({}) as Record<string, string | null>),
    getLastRoutineKey().catch(() => null),
    getLastRoutineFireMs().catch(() => null),
    getReminderRecords().catch(() => []),
  ]);

  const descFor = (id: string) => records.find((r) => r.scheduleId === id)?.desc || "";

  const enriched: EnrichedSchedule[] = schedules.map((s) => {
    const routineKey = s.routineKey ?? null;
    const isKnown = routineKey !== null && (ROUTINE_KEYS as string[]).includes(routineKey);

    let status: EnrichedSchedule["status"] = "unknown";
    let confirmedDate: string | null = null;
    let lastFire: number | null = null;
    if (isKnown) {
      const key = routineKey as RoutineKey;
      confirmedDate = confirmed[key] ?? null;
      const r = computeRoutineStatus({ key, lastRoutineKey: lastKey, lastFireMs, confirmedDate, now });
      status = r.status;
      lastFire = r.isLastFired ? lastFireMs : null;
    }

    return {
      scheduleId: s.scheduleId,
      cron: s.cron,
      cronLA: cronToLA(s.cron, now),
      destination: s.destination,
      routineKey,
      label: labelFor(routineKey),
      desc: descFor(s.scheduleId),
      prompt: s.prompt || "",
      paused: !!s.paused,
      nextFireMs: s.paused ? null : nextFireMs(s.cron, now),
      lastFireMs: lastFire,
      status,
      confirmedDate,
      isDue: isDue(s.cron, now),
    };
  });

  // sort: known routines first (by canonical order), then others
  const rank = (key: string | null) => {
    const i = key ? (ROUTINE_KEYS as string[]).indexOf(key) : -1;
    return i === -1 ? 99 : i;
  };
  enriched.sort((a, b) => rank(a.routineKey) - rank(b.routineKey));

  return NextResponse.json({
    schedules: enriched,
    destination: reminderDestUrl(),
    qstashError,
    generatedAt: Date.now(),
  });
}
