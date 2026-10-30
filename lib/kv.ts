import "server-only";
import { Redis } from "@upstash/redis";
import { env } from "./env";
import type { HistoryEntry } from "./types";

/**
 * The bot wrote everything via @vercel/kv, which stores raw (non-JSON-quoted)
 * strings. We read with automaticDeserialization:false so values come back EXACTLY
 * as stored — plain strings for memories/reading_log, JSON strings for history/reminders
 * which we parse manually. This removes all auto-parse ambiguity.
 */

let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: env.KV_REST_API_URL,
      token: env.KV_REST_API_TOKEN,
      automaticDeserialization: false,
    });
  }
  return _redis;
}

const UID = () => env.BOT_USER_ID;

const K = {
  profile: () => `user:${UID()}:profile`,
  memories: () => `user:${UID()}:memories`,
  history: () => `user:${UID()}:history`,
  readingCount: () => `user:${UID()}:reading_count`,
  readingLog: () => `user:${UID()}:reading_log`,
  reminders: () => `user:${UID()}:reminders`,
  lastRoutineKey: () => `user:${UID()}:lastRoutineKey`,
  lastRoutineFireMs: () => `user:${UID()}:lastRoutineFireMs`,
  routineConfirmed: (key: string) => `user:${UID()}:routine:${key}:confirmedDate`,
  avatar: () => `user:${UID()}:profile:avatar`,
  mainChatId: () => `main:chat_id`,
};

function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ---------- Profile (HASH) ----------
export async function getProfile(): Promise<Record<string, string>> {
  // With automaticDeserialization:false, hgetall returns a flat [field, value, ...]
  // array rather than an object — normalize both shapes.
  const raw = (await redis().hgetall(K.profile())) as unknown;
  if (!raw) return {};
  const out: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (let i = 0; i + 1 < raw.length; i += 2) {
      out[asString(raw[i])] = asString(raw[i + 1]);
    }
  } else if (typeof raw === "object") {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) out[k] = asString(v);
  }
  return out;
}

export async function setProfileField(field: string, value: string): Promise<void> {
  await redis().hset(K.profile(), { [field]: value });
}

export async function deleteProfileField(field: string): Promise<void> {
  await redis().hdel(K.profile(), field);
}

// ---------- Memories (LIST of plain strings) ----------
export async function getMemories(): Promise<string[]> {
  const items = (await redis().lrange(K.memories(), 0, -1)) as unknown[];
  return (items || []).map(asString);
}

export async function addMemory(text: string): Promise<void> {
  // store the exact string, mirroring the bot's "[date] text" convention
  await redis().rpush(K.memories(), text);
  await redis().ltrim(K.memories(), -50, -1);
}

/** Delete by value, not index: the list is capped (ltrim -50) so indexes shift
 *  whenever the bot adds a memory. Returns false if the text is no longer there. */
export async function deleteMemory(text: string): Promise<boolean> {
  return (await redis().lrem(K.memories(), 1, text)) > 0;
}

// ---------- History (LIST of JSON strings) ----------
function parseHistoryItem(raw: unknown, index: number): HistoryEntry | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { role: "assistant", content: raw, index };
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as { role?: string; content?: unknown; ts?: unknown };
  const role = o.role === "user" ? "user" : "assistant";
  const ts = typeof o.ts === "number" && Number.isFinite(o.ts) ? o.ts : undefined;
  let content = "";
  let hasImage = false;
  if (typeof o.content === "string") {
    content = o.content;
  } else if (Array.isArray(o.content)) {
    // multimodal: bot stores a placeholder; render "(photo envoyée)" not the image
    for (const part of o.content) {
      if (part && typeof part === "object") {
        const p = part as { type?: string; text?: string };
        if (p.type === "text" && p.text) content += p.text;
        if (p.type === "image") hasImage = true;
      }
    }
    if (hasImage && !content.trim()) content = "(photo envoyée)";
  } else {
    content = asString(o.content);
  }
  return { role, content, hasImage, index, ts };
}

export async function getHistoryLength(): Promise<number> {
  return (await redis().llen(K.history())) as number;
}

/** Returns the most recent `limit` entries, oldest-first, with absolute indices. */
export async function getHistory(limit = 50): Promise<HistoryEntry[]> {
  const len = await getHistoryLength();
  if (len === 0) return [];
  const start = Math.max(0, len - limit);
  const items = (await redis().lrange(K.history(), start, len - 1)) as unknown[];
  return (items || [])
    .map((raw, i) => parseHistoryItem(raw, start + i))
    .filter((x): x is HistoryEntry => x !== null);
}

/** All entries (used for cost estimation). */
export async function getAllHistory(): Promise<HistoryEntry[]> {
  const items = (await redis().lrange(K.history(), 0, -1)) as unknown[];
  return (items || [])
    .map((raw, i) => parseHistoryItem(raw, i))
    .filter((x): x is HistoryEntry => x !== null);
}

export async function getLastInOut(): Promise<{
  lastIn: HistoryEntry | null;
  lastOut: HistoryEntry | null;
}> {
  const tail = await getHistory(20);
  let lastIn: HistoryEntry | null = null;
  let lastOut: HistoryEntry | null = null;
  for (let i = tail.length - 1; i >= 0; i--) {
    if (!lastOut && tail[i].role === "assistant") lastOut = tail[i];
    if (!lastIn && tail[i].role === "user") lastIn = tail[i];
    if (lastIn && lastOut) break;
  }
  return { lastIn, lastOut };
}

// ---------- Reading ----------
export async function getReadingCount(): Promise<number> {
  const v = await redis().get(K.readingCount());
  return Number(asString(v)) || 0;
}

export async function setReadingCount(n: number): Promise<void> {
  await redis().set(K.readingCount(), String(Math.max(0, Math.floor(n))));
}

export async function getReadingLog(): Promise<string[]> {
  const items = (await redis().lrange(K.readingLog(), -100, -1)) as unknown[];
  return (items || []).map(asString);
}

export async function addReadingLogEntry(line: string): Promise<void> {
  await redis().rpush(K.readingLog(), line);
  await redis().ltrim(K.readingLog(), -100, -1);
}

// ---------- Reminders (LIST of JSON {scheduleId, desc}) ----------
export async function getReminderRecords(): Promise<{ scheduleId: string; desc: string }[]> {
  const items = (await redis().lrange(K.reminders(), 0, -1)) as unknown[];
  const out: { scheduleId: string; desc: string }[] = [];
  for (const raw of items || []) {
    try {
      const o = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (o && typeof o === "object" && "scheduleId" in o) {
        out.push({ scheduleId: String(o.scheduleId), desc: String(o.desc ?? "") });
      }
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

export async function addReminderRecord(scheduleId: string, desc: string): Promise<void> {
  await redis().rpush(K.reminders(), JSON.stringify({ scheduleId, desc }));
}

/** Remove the reminders-list record(s) matching a scheduleId (cleanup on delete). */
export async function removeReminderRecord(scheduleId: string): Promise<void> {
  const items = (await redis().lrange(K.reminders(), 0, -1)) as unknown[];
  for (const raw of items || []) {
    try {
      const o = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (o && typeof o === "object" && o.scheduleId === scheduleId) {
        await redis().lrem(K.reminders(), 1, typeof raw === "string" ? raw : JSON.stringify(raw));
      }
    } catch {
      /* skip */
    }
  }
}

// ---------- Routine state ----------
export async function getLastRoutineKey(): Promise<string | null> {
  const v = asString(await redis().get(K.lastRoutineKey()));
  return v || null;
}

export async function getLastRoutineFireMs(): Promise<number | null> {
  const v = asString(await redis().get(K.lastRoutineFireMs()));
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export async function getRoutineConfirmedDate(key: string): Promise<string | null> {
  const v = asString(await redis().get(K.routineConfirmed(key)));
  return v || null;
}

export async function getAllRoutineConfirmed(
  keys: string[]
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {};
  await Promise.all(
    keys.map(async (k) => {
      out[k] = await getRoutineConfirmedDate(k);
    })
  );
  return out;
}

// ---------- Avatar (string, base64 data URL) ----------
export async function getAvatar(): Promise<string | null> {
  const v = asString(await redis().get(K.avatar()));
  return v || null;
}

export async function setAvatar(dataUrl: string): Promise<void> {
  await redis().set(K.avatar(), dataUrl);
}

export async function deleteAvatar(): Promise<void> {
  await redis().del(K.avatar());
}

// ---------- Bot kill-switch (bot:enabled) ----------
export async function getBotEnabled(): Promise<boolean> {
  const v = asString(await redis().get("bot:enabled"));
  return v !== "0"; // default ON unless explicitly disabled
}

export async function setBotEnabled(on: boolean): Promise<void> {
  await redis().set("bot:enabled", on ? "1" : "0");
}

// ---------- Heartbeat ----------
export async function getHeartbeatMs(): Promise<number | null> {
  const v = asString(await redis().get("bot:heartbeat:lastMs"));
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// ---------- Bot model preference (config:model) ----------
export async function getModel(): Promise<string> {
  const v = asString(await redis().get("config:model"));
  return v || env.ANTHROPIC_MODEL;
}

export async function setModel(model: string): Promise<void> {
  await redis().set("config:model", model);
}

export async function getMainChatId(): Promise<string | null> {
  const v = asString(await redis().get(K.mainChatId()));
  return v || null;
}

// ---------- Voice notes (dashboard-owned, playable audio) ----------
// The bot history is text-only and capped to the last 20 entries, so we keep the
// audio separately and re-link it to a message by exact transcript match within
// the visible window. Audio is a base64 data URL with a 30-day TTL.
const VK = {
  voiceLog: () => `dash:voicelog`,
  voiceAud: (id: string) => `dash:voiceaud:${id}`,
  photoLog: () => `dash:photolog`,
  photoData: (id: string) => `dash:photodata:${id}`,
};

export interface VoiceLogEntry {
  id: string;
  content: string;
  durationMs: number;
  ts: number;
}

export async function storeVoice(
  id: string,
  content: string,
  audioDataUrl: string,
  durationMs: number
): Promise<void> {
  await redis().set(VK.voiceAud(id), audioDataUrl);
  await redis().rpush(VK.voiceLog(), JSON.stringify({ id, content, durationMs, ts: Date.now() }));
  await redis().ltrim(VK.voiceLog(), -60, -1);
}

export async function getVoiceLog(): Promise<VoiceLogEntry[]> {
  const items = (await redis().lrange(VK.voiceLog(), 0, -1)) as unknown[];
  const out: VoiceLogEntry[] = [];
  for (const raw of items || []) {
    try {
      const o = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (o && typeof o === "object" && o.id) {
        out.push({ id: String(o.id), content: String(o.content ?? ""), durationMs: Number(o.durationMs) || 0, ts: Number(o.ts) || 0 });
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function getVoiceAudio(id: string): Promise<string | null> {
  const v = asString(await redis().get(VK.voiceAud(id)));
  return v || null;
}

// ---------- Photo notes (dashboard-owned, viewable thumbnails) ----------
export interface PhotoLogEntry {
  id: string;
  content: string;
  ts: number;
}

export async function storePhoto(id: string, content: string, dataUrl: string): Promise<void> {
  await redis().set(VK.photoData(id), dataUrl);
  await redis().rpush(VK.photoLog(), JSON.stringify({ id, content, ts: Date.now() }));
  await redis().ltrim(VK.photoLog(), -60, -1);
}

export async function getPhotoLog(): Promise<PhotoLogEntry[]> {
  const items = (await redis().lrange(VK.photoLog(), 0, -1)) as unknown[];
  const out: PhotoLogEntry[] = [];
  for (const raw of items || []) {
    try {
      const o = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (o && typeof o === "object" && o.id) {
        out.push({ id: String(o.id), content: String(o.content ?? ""), ts: Number(o.ts) || 0 });
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function getPhotoData(id: string): Promise<string | null> {
  const v = asString(await redis().get(VK.photoData(id)));
  return v || null;
}

/** Lightweight round-trip used by the /settings ping. */
export async function pingKv(): Promise<string> {
  await redis().get(K.mainChatId());
  return "ok";
}
