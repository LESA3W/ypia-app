import type { RoutineKey, RoutineStatus } from "./types";

/** All crons are in UTC (as configured on QStash). */
export const ROUTINE_CRONS: Record<RoutineKey, string> = {
  sleep_test: "0 22 * * *",
  nuit: "*/10 7-15 * * *",
  matin: "*/5 16-18 * * *",
  lait: "0 17 * * *",
};

export const ROUTINE_LABELS: Record<RoutineKey, string> = {
  sleep_test: "Sleep test",
  nuit: "Nuit",
  matin: "Matin",
  lait: "Lait",
};

export const ROUTINE_KEYS: RoutineKey[] = ["nuit", "matin", "lait", "sleep_test"];

/** UTC window [startHour, endHour) for each routine, in whole hours. */
const WINDOWS: Record<RoutineKey, { startH: number; endH: number }> = {
  sleep_test: { startH: 22, endH: 24 }, // single fire 22:00 -> treat until end of UTC day
  nuit: { startH: 7, endH: 16 }, // */10 7-15 -> last fire 15:50
  matin: { startH: 16, endH: 19 }, // */5 16-18 -> last fire 18:55
  lait: { startH: 17, endH: 24 }, // single fire 17:00 -> until end of UTC day
};

const TZ = "America/Los_Angeles";

/** YYYY-MM-DD in LA timezone. en-CA yields ISO-like format. */
export function todayLA(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function laDateOf(ms: number): string {
  return todayLA(new Date(ms));
}

function utcHourStart(now: Date, hour: number): Date {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0, 0)
  );
  return d;
}

export function windowStartUtc(key: RoutineKey, now: Date = new Date()): Date {
  return utcHourStart(now, WINDOWS[key].startH);
}

export function windowEndUtc(key: RoutineKey, now: Date = new Date()): Date {
  return utcHourStart(now, WINDOWS[key].endH);
}

export function isConfirmedToday(confirmedDate: string | null, now: Date = new Date()): boolean {
  return !!confirmedDate && confirmedDate === todayLA(now);
}

/** Human-readable LA window label, e.g. "23:00–08:00 (LA)". */
export function windowLabelLA(key: RoutineKey, now: Date = new Date()): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  const start = windowStartUtc(key, now);
  const end = windowEndUtc(key, now);
  return `${fmt(start)}–${fmt(end)} (LA)`;
}

export interface RoutineAlertInput {
  key: RoutineKey;
  lastRoutineKey: string | null;
  lastFireMs: number | null;
  confirmedDate: string | null;
  now?: Date;
}

export function computeRoutineStatus(input: RoutineAlertInput): {
  status: RoutineStatus;
  isLastFired: boolean;
} {
  const { key, lastRoutineKey, lastFireMs, confirmedDate } = input;
  const now = input.now ?? new Date();
  const today = todayLA(now);

  const isLastFired =
    lastRoutineKey === key && lastFireMs !== null && laDateOf(lastFireMs) === today;

  if (confirmedDate === today) return { status: "confirmed", isLastFired };

  const nowMs = now.getTime();
  const winStart = windowStartUtc(key, now).getTime();
  const winEnd = windowEndUtc(key, now).getTime();

  if (nowMs < winStart) return { status: "pending", isLastFired };

  if (nowMs > winEnd) {
    return { status: isLastFired ? "fired-unconfirmed" : "missed", isLastFired };
  }
  // window currently open
  return { status: isLastFired ? "fired-unconfirmed" : "in-window", isLastFired };
}

export const ROUTINE_STATUS_META: Record<
  RoutineStatus,
  { label: string; tone: "ok" | "warn" | "danger" | "muted" | "info" }
> = {
  confirmed: { label: "Confirmé", tone: "ok" },
  pending: { label: "En attente", tone: "muted" },
  "in-window": { label: "Fenêtre ouverte", tone: "info" },
  "fired-unconfirmed": { label: "Tiré, non confirmé", tone: "warn" },
  missed: { label: "Non tiré ⚠️", tone: "danger" },
};
