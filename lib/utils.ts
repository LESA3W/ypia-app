import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Locale-aware relative time via native Intl.RelativeTimeFormat (all 10 locales). */
export function relativeTime(ms: number | null | undefined, locale = "en"): string {
  if (!ms) return "—";
  const diffMs = ms - Date.now(); // negative = past, positive = future
  const abs = Math.abs(diffMs);
  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (abs < 60_000) {
    value = Math.round(diffMs / 1000);
    unit = "second";
  } else if (abs < 3_600_000) {
    value = Math.round(diffMs / 60_000);
    unit = "minute";
  } else if (abs < 86_400_000) {
    value = Math.round(diffMs / 3_600_000);
    unit = "hour";
  } else {
    value = Math.round(diffMs / 86_400_000);
    unit = "day";
  }
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" }).format(value, unit);
  } catch {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" }).format(value, unit);
  }
}

export function formatUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

export function formatTime(ms: number, tz = "America/Los_Angeles"): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export function formatDateTime(ms: number, tz = "America/Los_Angeles"): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}
