import "server-only";
import { env } from "./env";
import { fetchWithTimeout } from "./http";

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

function extFor(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

/**
 * Transcribe an audio clip with Groq Whisper (whisper-large-v3-turbo).
 * Returns the recognized text, or null on failure / missing key.
 */
export async function transcribeAudio(bytes: Uint8Array, mime = "audio/webm"): Promise<string | null> {
  if (!env.GROQ_API_KEY) return null;
  try {
    const form = new FormData();
    form.append("file", new Blob([bytes as unknown as BlobPart], { type: mime }), `audio.${extFor(mime)}`);
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "json");
    const res = await fetchWithTimeout(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
      body: form,
      timeoutMs: 30000,
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { text?: string } | null;
    const text = json?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}
