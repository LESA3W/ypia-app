import "server-only";
import { env } from "./env";
import { fetchWithTimeout } from "./http";

const api = (method: string) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
const fileApi = (path: string) => `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${path}`;

async function tg<T = unknown>(method: string, body?: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(api(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      timeoutMs: 8000,
    });
    const json = await res.json();
    return json?.ok ? (json.result as T) : null;
  } catch {
    return null;
  }
}

export interface TelegramProfile {
  name: string;
  shortDescription: string;
  description: string;
}

/** The bot's @username (for a t.me deep link). Null if unavailable. */
export async function getBotUsername(): Promise<string | null> {
  const me = await tg<{ username?: string }>("getMe");
  return me?.username ?? null;
}

export async function getTelegramProfile(): Promise<TelegramProfile> {
  const [name, shortD, desc] = await Promise.all([
    tg<{ name: string }>("getMyName"),
    tg<{ short_description: string }>("getMyShortDescription"),
    tg<{ description: string }>("getMyDescription"),
  ]);
  return {
    name: name?.name ?? "",
    shortDescription: shortD?.short_description ?? "",
    description: desc?.description ?? "",
  };
}

export async function setTelegramProfile(input: {
  name?: string;
  shortDescription?: string;
  description?: string;
}): Promise<{ name: boolean; shortDescription: boolean; description: boolean }> {
  const out = { name: true, shortDescription: true, description: true };
  if (input.name !== undefined) out.name = (await tg("setMyName", { name: input.name })) !== null;
  if (input.shortDescription !== undefined)
    out.shortDescription = (await tg("setMyShortDescription", { short_description: input.shortDescription })) !== null;
  if (input.description !== undefined)
    out.description = (await tg("setMyDescription", { description: input.description })) !== null;
  return out;
}

/**
 * Set the bot's own profile photo (Bot API setMyProfilePhoto). The photo is a
 * static InputProfilePhoto uploaded via multipart and referenced with attach://.
 */
export async function setTelegramPhoto(bytes: Uint8Array, mime = "image/jpeg"): Promise<boolean> {
  try {
    const form = new FormData();
    form.append("photo", JSON.stringify({ type: "static", photo: "attach://pic" }));
    form.append("pic", new Blob([bytes as unknown as BlobPart], { type: mime }), "photo.jpg");
    const res = await fetchWithTimeout(api("setMyProfilePhoto"), { method: "POST", body: form, timeoutMs: 20000 });
    const json = await res.json().catch(() => null);
    return !!json?.ok;
  } catch {
    return false;
  }
}

export async function removeTelegramPhoto(): Promise<boolean> {
  return (await tg("removeMyProfilePhoto")) !== null;
}

/** Download the bot's current profile photo (largest size) as raw bytes. */
export async function getTelegramPhoto(): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const me = await tg<{ id: number }>("getMe");
  if (!me?.id) return null;
  const photos = await tg<{ total_count: number; photos: { file_id: string }[][] }>("getUserProfilePhotos", {
    user_id: me.id,
    limit: 1,
  });
  const first = photos?.photos?.[0];
  if (!first || first.length === 0) return null;
  const largest = first[first.length - 1]; // sizes are ordered small -> large
  const file = await tg<{ file_path: string }>("getFile", { file_id: largest.file_id });
  if (!file?.file_path) return null;
  try {
    const res = await fetchWithTimeout(fileApi(file.file_path), { timeoutMs: 15000 });
    if (!res.ok) return null;
    return { bytes: await res.arrayBuffer(), contentType: res.headers.get("content-type") || "image/jpeg" };
  } catch {
    return null;
  }
}
