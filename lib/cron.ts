import { CronExpressionParser } from "cron-parser";

const TZ = "America/Los_Angeles";

/** Current LA UTC offset in hours (negative, e.g. -7 PDT / -8 PST) for `now`. */
export function laOffsetHours(now: Date = new Date()): number {
  // Compute offset by comparing the same instant formatted in LA vs UTC.
  const laParts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(laParts.find((p) => p.type === t)?.value);
  const laAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, now.getUTCMinutes());
  // round to the nearest hour difference
  const diffMs = laAsUtc - Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes());
  return Math.round(diffMs / 3_600_000);
}

function shiftHourToken(token: string, offset: number): string {
  const wrap = (n: number) => ((n + offset) % 24 + 24) % 24;
  if (token === "*") return token;
  // step like */5 in hour position -> leave as-is (rare for hour)
  if (token.startsWith("*/")) return token;
  // range a-b
  if (token.includes("-")) {
    const [a, b] = token.split("-").map((x) => parseInt(x, 10));
    if (Number.isFinite(a) && Number.isFinite(b)) return `${wrap(a)}-${wrap(b)}`;
    return token;
  }
  // comma list
  if (token.includes(",")) {
    return token
      .split(",")
      .map((x) => {
        const n = parseInt(x, 10);
        return Number.isFinite(n) ? String(wrap(n)) : x;
      })
      .join(",");
  }
  const n = parseInt(token, 10);
  return Number.isFinite(n) ? String(wrap(n)) : token;
}

/**
 * Best-effort UTC -> LA conversion of a cron's hour field for display only.
 * Minute/day/month/dow are left unchanged (DST + midnight wrap not modeled).
 */
export function cronToLA(cron: string, now: Date = new Date()): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const offset = laOffsetHours(now);
  parts[1] = shiftHourToken(parts[1], offset);
  return parts.join(" ");
}

/** Next scheduled fire (absolute ms) for a UTC cron, or null if unparseable. */
export function nextFireMs(cron: string, now: Date = new Date()): number | null {
  try {
    const it = CronExpressionParser.parse(cron, { currentDate: now, tz: "UTC" });
    return it.next().toDate().getTime();
  } catch {
    return null;
  }
}

/** Previous scheduled fire (absolute ms) for a UTC cron, or null. */
export function prevFireMs(cron: string, now: Date = new Date()): number | null {
  try {
    const it = CronExpressionParser.parse(cron, { currentDate: now, tz: "UTC" });
    return it.prev().toDate().getTime();
  } catch {
    return null;
  }
}

export type CronHuman =
  | { kind: "interval"; n: number; fromH: number; toH: number }
  | { kind: "daily"; hour: number; minute: number }
  | { kind: "weekly"; dow: number; hour: number; minute: number };

/**
 * Parse a UTC cron into a human-friendly structure, with hours converted to LA.
 * Covers our routine patterns: "*\/N A-B * * *", "M H * * *", "M H * * D".
 * Returns null if it doesn't match a known shape (caller falls back to raw cron).
 */
export function parseCronHuman(cronUtc: string, now: Date = new Date()): CronHuman | null {
  const p = cronUtc.trim().split(/\s+/);
  if (p.length !== 5) return null;
  const [minF, hourF, , , dowF] = p;
  const off = laOffsetHours(now);
  const wrap = (n: number) => ((n + off) % 24 + 24) % 24;

  if (minF.startsWith("*/")) {
    const n = parseInt(minF.slice(2), 10);
    if (!Number.isFinite(n)) return null;
    if (hourF.includes("-")) {
      const [a, b] = hourF.split("-").map((x) => parseInt(x, 10));
      if (Number.isFinite(a) && Number.isFinite(b)) return { kind: "interval", n, fromH: wrap(a), toH: wrap(b + 1) };
    }
    if (hourF === "*") return { kind: "interval", n, fromH: 0, toH: 24 };
    return null;
  }

  const minute = parseInt(minF, 10);
  const hour = parseInt(hourF, 10);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) return null;
  const laHour = wrap(hour);
  if (dowF && dowF !== "*") {
    const dow = parseInt(dowF.split(",")[0], 10);
    if (Number.isFinite(dow)) return { kind: "weekly", dow: ((dow % 7) + 7) % 7, hour: laHour, minute };
  }
  return { kind: "daily", hour: laHour, minute };
}

/** "Due" = the most recent scheduled occurrence was within the last 65 minutes. */
export function isDue(cron: string, now: Date = new Date()): boolean {
  const prev = prevFireMs(cron, now);
  if (prev === null) return false;
  return now.getTime() - prev <= 65 * 60 * 1000;
}
