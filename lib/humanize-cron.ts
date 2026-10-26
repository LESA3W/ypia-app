// Client-safe cron humanizer (no cron-parser dependency).
// Converts a UTC cron into a friendly, localized sentence with LA times.

const TZ = "America/Los_Angeles";

function laOffsetHours(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const laAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, now.getUTCMinutes());
  const baseUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes());
  return Math.round((laAsUtc - baseUtc) / 3_600_000);
}

function weekdayName(dow: number, locale: string): string {
  // 2024-01-07 is a Sunday (dow 0)
  const d = new Date(Date.UTC(2024, 0, 7 + dow));
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(d);
}

function fmtTime(h: number, m: number): string {
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

type T = (key: string, values?: Record<string, string | number>) => string;

/** Returns a localized human sentence, or the raw cron if the shape is unknown. */
export function humanizeCron(cronUtc: string, t: T, locale: string, now: Date = new Date()): string {
  const p = cronUtc.trim().split(/\s+/);
  if (p.length !== 5) return cronUtc;
  const [minF, hourF, , , dowF] = p;
  const off = laOffsetHours(now);
  const wrap = (n: number) => ((n + off) % 24 + 24) % 24;

  if (minF.startsWith("*/")) {
    const n = parseInt(minF.slice(2), 10);
    if (!Number.isFinite(n)) return cronUtc;
    if (hourF.includes("-")) {
      const [a, b] = hourF.split("-").map((x) => parseInt(x, 10));
      if (Number.isFinite(a) && Number.isFinite(b))
        return t("every", { n, from: `${wrap(a)}h`, to: `${wrap(b + 1)}h` });
    }
    if (hourF === "*") return t("every", { n, from: "0h", to: "24h" });
    return cronUtc;
  }

  const minute = parseInt(minF, 10);
  const hour = parseInt(hourF, 10);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) return cronUtc;
  const time = fmtTime(wrap(hour), minute);
  if (dowF && dowF !== "*") {
    const dow = parseInt(dowF.split(",")[0], 10);
    if (Number.isFinite(dow)) return t("weekly", { day: weekdayName(((dow % 7) + 7) % 7, locale), time });
  }
  return t("daily", { time });
}
