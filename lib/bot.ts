import "server-only";
import { env } from "./env";
import { fetchWithTimeout } from "./http";
import type { RoutineKey } from "./types";

export const ROUTINE_DEFS: Record<
  RoutineKey,
  { prompt: string; defaultCron: string; label: string }
> = {
  sleep_test: { prompt: "Rappel", defaultCron: "0 22 * * *", label: "Sleep test" },
  nuit: { prompt: "Rappel", defaultCron: "*/10 7-15 * * *", label: "Nuit" },
  matin: { prompt: "Rappel", defaultCron: "*/5 16-18 * * *", label: "Matin" },
  lait: { prompt: "Rappel", defaultCron: "0 17 * * *", label: "Lait" },
};

export function reminderDestUrl(): string {
  return `${env.BOT_BASE_URL}/api/reminder`;
}

/** Manually fire a routine by POSTing directly to the bot's /api/reminder. */
export async function triggerRoutine(routineKey: string, prompt?: string): Promise<void> {
  const res = await fetchWithTimeout(reminderDestUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-reminder-secret": env.CRON_SECRET,
    },
    body: JSON.stringify({
      chatId: env.BOT_USER_ID,
      prompt: prompt || "Rappel",
      routineKey,
    }),
    timeoutMs: 20000,
  });
  if (!res.ok) {
    throw new Error(`Trigger ${routineKey} -> ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
}

/** Send a fake Telegram update to the bot webhook (no signature required). */
export async function sendFakeUpdate(text: string): Promise<void> {
  const id = Number(env.BOT_USER_ID);
  const res = await fetchWithTimeout(`${env.BOT_BASE_URL}/api/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      update_id: Math.floor(Date.now() / 1000),
      message: {
        message_id: Math.floor(Date.now() / 1000),
        date: Math.floor(Date.now() / 1000),
        chat: { id, type: "private" },
        from: { id, is_bot: false, first_name: "Dashboard" },
        text,
      },
    }),
    timeoutMs: 25000,
  });
  if (!res.ok) {
    throw new Error(`Webhook -> ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
}

/** Send a photo (base64 data URL) to the bot webhook for vision analysis. */
export async function sendFakePhotoUpdate(dataUrl: string, caption = ""): Promise<void> {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("bad image data");
  const id = Number(env.BOT_USER_ID);
  const res = await fetchWithTimeout(`${env.BOT_BASE_URL}/api/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      update_id: Math.floor(Date.now() / 1000),
      message: {
        message_id: Math.floor(Date.now() / 1000),
        date: Math.floor(Date.now() / 1000),
        chat: { id, type: "private" },
        from: { id, is_bot: false, first_name: "Dashboard" },
        caption,
        photo_b64: m[2],
        photo_mime: m[1],
      },
    }),
    timeoutMs: 30000,
  });
  if (!res.ok) {
    throw new Error(`Webhook(photo) -> ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
}

/** Reachability ping for /settings. */
export async function pingBot(): Promise<string> {
  const res = await fetchWithTimeout(`${env.BOT_BASE_URL}/api/webhook`, { timeoutMs: 8000 });
  if (!res.ok) throw new Error(`Bot ${res.status}`);
  return "ok";
}
