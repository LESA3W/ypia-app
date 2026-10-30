import "server-only";
import { env } from "./env";
import { fetchJson, fetchWithTimeout } from "./http";
import type { QStashSchedule, QStashEvent } from "./types";

function auth() {
  return { Authorization: `Bearer ${env.QSTASH_TOKEN}` };
}

interface RawSchedule {
  scheduleId: string;
  cron: string;
  destination: string;
  createdAt?: number;
  isPaused?: boolean;
  paused?: boolean;
  body?: string;
}

function parseBody(body?: string): { routineKey?: string; prompt?: string } {
  if (!body) return {};
  try {
    const o = JSON.parse(body);
    return {
      routineKey: typeof o?.routineKey === "string" ? o.routineKey : undefined,
      prompt: typeof o?.prompt === "string" ? o.prompt : undefined,
    };
  } catch {
    return {};
  }
}

function mapSchedule(s: RawSchedule): QStashSchedule {
  const { routineKey, prompt } = parseBody(s.body);
  return {
    scheduleId: s.scheduleId,
    cron: s.cron,
    destination: s.destination,
    createdAt: s.createdAt,
    paused: s.isPaused ?? s.paused ?? false,
    routineKey,
    prompt,
    rawBody: s.body,
  };
}

export async function listSchedules(): Promise<QStashSchedule[]> {
  const raw = await fetchJson<RawSchedule[]>(`${env.QSTASH_URL}/v2/schedules`, {
    headers: auth(),
  });
  return (raw || []).map(mapSchedule);
}

export async function getSchedule(id: string): Promise<QStashSchedule | null> {
  const res = await fetchWithTimeout(`${env.QSTASH_URL}/v2/schedules/${encodeURIComponent(id)}`, {
    headers: auth(),
  });
  // null only when the schedule is really gone; any other failure (429, 5xx) must
  // abort the caller instead of being mistaken for "does not exist".
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`QStash get ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const text = await res.text();
  if (!text) return null;
  return mapSchedule(JSON.parse(text) as RawSchedule);
}

export async function pauseSchedule(id: string): Promise<void> {
  const res = await fetchWithTimeout(
    `${env.QSTASH_URL}/v2/schedules/${encodeURIComponent(id)}/pause`,
    { method: "POST", headers: auth() }
  );
  if (!res.ok) throw new Error(`QStash pause ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

export async function resumeSchedule(id: string): Promise<void> {
  const res = await fetchWithTimeout(
    `${env.QSTASH_URL}/v2/schedules/${encodeURIComponent(id)}/resume`,
    { method: "POST", headers: auth() }
  );
  if (!res.ok) throw new Error(`QStash resume ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getScheduleEvents(scheduleId: string, count = 20): Promise<QStashEvent[]> {
  const url = `${env.QSTASH_URL}/v2/events?scheduleId=${encodeURIComponent(scheduleId)}&count=${count}`;
  const res = await fetchWithTimeout(url, { headers: auth(), timeoutMs: 8000 });
  if (!res.ok) throw new Error(`QStash events ${res.status}`);
  const json = (await res.json()) as { events?: any[] };
  return (json.events || []).map((e) => ({
    time: typeof e.time === "number" ? e.time : Date.parse(e.time) || 0,
    state: String(e.state || e.status || "unknown"),
    messageId: e.messageId,
    error: e.error || e.responseBody,
  }));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function deleteSchedule(id: string): Promise<void> {
  const res = await fetchWithTimeout(`${env.QSTASH_URL}/v2/schedules/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: auth(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`QStash delete ${res.status}: ${(await res.text()).slice(0, 120)}`);
  }
}

export interface CreateScheduleInput {
  destinationUrl: string;
  cron: string;
  reminderSecret: string;
  body: Record<string, unknown>;
  /** Forwarded secret header name (without the Upstash-Forward- prefix). */
  forwardHeader?: string;
}

export async function createSchedule(
  input: CreateScheduleInput
): Promise<{ scheduleId: string }> {
  const url = `${env.QSTASH_URL}/v2/schedules/${input.destinationUrl}`;
  const fwd = input.forwardHeader || "x-reminder-secret";
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      ...auth(),
      "Content-Type": "application/json",
      "Upstash-Cron": input.cron,
      [`Upstash-Forward-${fwd}`]: input.reminderSecret,
    },
    body: JSON.stringify(input.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`QStash schedule ${res.status}: ${text.slice(0, 160)}`);
  const json = text ? JSON.parse(text) : {};
  return { scheduleId: json.scheduleId };
}

/** Lightweight reachability check for the /settings ping. */
export async function pingQstash(): Promise<string> {
  const res = await fetchWithTimeout(`${env.QSTASH_URL}/v2/schedules`, {
    headers: auth(),
    timeoutMs: 6000,
  });
  if (!res.ok) throw new Error(`QStash ${res.status}`);
  return "ok";
}
