import "server-only";
import { env } from "./env";
import { fetchWithTimeout } from "./http";
import { listSchedules, createSchedule, pauseSchedule, resumeSchedule, deleteSchedule } from "./qstash";
import { getHeartbeatMs } from "./kv";

export function heartbeatDestUrl(): string {
  return `${env.BOT_BASE_URL}/api/heartbeat`;
}

function intervalFromCron(cron: string): number | null {
  const min = cron.trim().split(/\s+/)[0];
  if (min?.startsWith("*/")) {
    const n = parseInt(min.slice(2), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export interface HeartbeatStatus {
  lastMs: number | null;
  alive: boolean;
  ageMs: number | null;
  configured: boolean;
  enabled: boolean;
  paused: boolean;
  scheduleId: string | null;
  intervalMin: number | null;
  thresholdMin: number;
}

export async function getHeartbeatStatus(): Promise<HeartbeatStatus> {
  const [lastMs, schedules] = await Promise.all([
    getHeartbeatMs().catch(() => null),
    listSchedules().catch(() => []),
  ]);
  const dest = heartbeatDestUrl();
  const hb = schedules.find((s) => (s.destination || "").replace(/\/$/, "").endsWith("/api/heartbeat")) ?? null;
  const intervalMin = hb ? intervalFromCron(hb.cron) : null;
  // down if no beat within 2.5× the interval (min 12 min if unknown)
  const thresholdMin = Math.max(12, Math.round((intervalMin ?? 10) * 2.5));
  const now = Date.now();
  const ageMs = lastMs ? now - lastMs : null;
  const alive = lastMs != null && now - lastMs < thresholdMin * 60_000;
  return {
    lastMs,
    alive,
    ageMs,
    configured: !!hb,
    enabled: !!hb && !hb.paused,
    paused: !!hb?.paused,
    scheduleId: hb?.scheduleId ?? null,
    intervalMin,
    thresholdMin,
  };
}

export async function pingHeartbeatNow(): Promise<void> {
  const res = await fetchWithTimeout(heartbeatDestUrl(), {
    method: "POST",
    headers: { "x-heartbeat-secret": env.CRON_SECRET },
    timeoutMs: 12000,
  });
  if (!res.ok) throw new Error(`Heartbeat ping ${res.status}`);
}

export async function createHeartbeat(intervalMin: number): Promise<{ scheduleId: string }> {
  const n = Math.min(60, Math.max(1, Math.floor(intervalMin)));
  return createSchedule({
    destinationUrl: heartbeatDestUrl(),
    cron: `*/${n} * * * *`,
    reminderSecret: env.CRON_SECRET,
    forwardHeader: "x-heartbeat-secret",
    body: {},
  });
}

/** Change interval = delete current heartbeat schedule + recreate (QStash is immutable). */
export async function setHeartbeatInterval(intervalMin: number): Promise<{ scheduleId: string }> {
  // listSchedules() without a catch: a lookup failure must abort, not create a duplicate.
  const schedules = await listSchedules();
  const current = schedules.filter((s) => (s.destination || "").replace(/\/$/, "").endsWith("/api/heartbeat"));
  for (const s of current) await deleteSchedule(s.scheduleId);
  return createHeartbeat(intervalMin);
}

export async function pauseHeartbeat(): Promise<void> {
  const s = await getHeartbeatStatus();
  if (s.scheduleId) await pauseSchedule(s.scheduleId);
}

export async function resumeHeartbeat(): Promise<void> {
  const s = await getHeartbeatStatus();
  if (s.scheduleId) await resumeSchedule(s.scheduleId);
}

export async function deleteHeartbeat(): Promise<void> {
  const s = await getHeartbeatStatus();
  if (s.scheduleId) await deleteSchedule(s.scheduleId);
}
